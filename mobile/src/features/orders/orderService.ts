import { env } from '@/config/env';
import { eventsApi } from '@/features/events/api';
import { ApiError } from '@/lib/api';
import { newIdempotencyKey, ordersApi, toIssuedTickets, toOrderStatus, withQrTokens, type ApiOrder } from './api';
import { detectPaymentMethod } from './paymentMethods';
import { sampleOrders } from './sampleOrders';
import { RESERVATION_MINUTES, type CreateTicketOrderInput, type TicketOrder } from './types';

type OrderContext = Omit<TicketOrder, 'id' | 'status' | 'amount' | 'expiresAt' | 'createdAt' | 'reference' | 'tickets'> & {
  holderName: string;
};

const contexts = new Map<string, OrderContext>();

const fromApi = (order: ApiOrder, context: OrderContext): TicketOrder => ({
  ...context,
  id: order.id,
  status: toOrderStatus(order.status),
  amount: order.amount,
  expiresAt: order.expiresAt,
  createdAt: order.createdAt ?? new Date().toISOString(),
  reference: order.payment?.externalRef,
  tickets: toIssuedTickets(order, context.holderName),
});

async function findTier(eventId: string, tierId: string) {
  const tier = (await eventsApi.tiers(eventId)).find((item) => item.id === tierId);
  if (!tier) throw new ApiError('NOT_FOUND', 'Ticket tier not found', 404);
  return tier;
}

async function contextFromOrder(order: ApiOrder): Promise<OrderContext> {
  const item = order.items[0];
  if (!order.eventId || !item) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  const tier = await findTier(order.eventId, item.refId);
  const phone = order.phone ?? '';
  return {
    eventId: order.eventId,
    tierId: item.refId,
    tierName: tier.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    phone,
    method: detectPaymentMethod(phone) ?? 'mtn',
    holderName: '',
  };
}

async function loadOrder(orderId: string, request: (id: string) => Promise<ApiOrder>) {
  const order = await withQrTokens(await request(orderId));
  let context = contexts.get(orderId);
  if (!context) {
    context = await contextFromOrder(order);
    contexts.set(orderId, context);
  }
  return fromApi(order, context);
}

async function buildContext(input: CreateTicketOrderInput): Promise<OrderContext> {
  const tier = await findTier(input.eventId, input.tierId);
  return {
    eventId: input.eventId,
    tierId: input.tierId,
    tierName: tier.name,
    quantity: input.quantity,
    unitPrice: tier.price,
    phone: input.phone,
    method: input.method,
    holderName: input.holderName,
  };
}

export async function createTicketOrder(input: CreateTicketOrderInput): Promise<TicketOrder> {
  const context = await buildContext(input);
  if (env.useSampleData) {
    const now = Date.now();
    return sampleOrders.save(
      {
        ...context,
        id: sampleOrders.newId(),
        status: 'pending',
        amount: context.unitPrice * context.quantity,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + RESERVATION_MINUTES * 60 * 1000).toISOString(),
        tickets: [],
      },
      input.holderName,
    );
  }
  const order = await withQrTokens(
    await ordersApi.createTicketOrder(input, input.idempotencyKey ?? newIdempotencyKey()),
  );
  contexts.set(order.id, context);
  return fromApi(order, context);
}

export async function getTicketOrder(orderId: string): Promise<TicketOrder> {
  if (env.useSampleData) {
    const order = sampleOrders.get(orderId);
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
    return order;
  }
  return loadOrder(orderId, ordersApi.getOrder);
}

export async function verifyTicketOrder(orderId: string): Promise<TicketOrder> {
  if (env.useSampleData) return getTicketOrder(orderId);
  return loadOrder(orderId, ordersApi.verifyOrder);
}
