import { env } from '@/config/env';
import { getSampleEventDetails } from '@/features/events/sampleEventDetails';
import { ApiError } from '@/lib/api';
import { ordersApi, toIssuedTickets, toOrderStatus, type ApiOrder } from './api';
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

function buildContext(input: CreateTicketOrderInput): OrderContext {
  const tier = getSampleEventDetails(input.eventId)?.tiers.find((item) => item.id === input.tierId);
  if (!tier) throw new ApiError('NOT_FOUND', 'Ticket tier not found', 404);
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
  const context = buildContext(input);
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
  const order = await ordersApi.createTicketOrder(input);
  contexts.set(order.id, context);
  return fromApi(order, context);
}

export async function getTicketOrder(orderId: string): Promise<TicketOrder> {
  if (env.useSampleData) {
    const order = sampleOrders.get(orderId);
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
    return order;
  }
  const context = contexts.get(orderId);
  if (!context) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  return fromApi(await ordersApi.getOrder(orderId), context);
}

export async function verifyTicketOrder(orderId: string): Promise<TicketOrder> {
  if (env.useSampleData) return getTicketOrder(orderId);
  const context = contexts.get(orderId);
  if (!context) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  return fromApi(await ordersApi.verifyOrder(orderId), context);
}
