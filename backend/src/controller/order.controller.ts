import type { RequestHandler } from 'express';
import {
  purchaseHeaders,
  type CreateBookingOrderBody,
  type CreateTicketOrderBody,
  type ListMyOrdersQuery,
} from '../schema/order.schema';
import type { CreateSlotOrderBody } from '../schema/slot.schema';
import * as orderService from '../service/order.service';
import { requestLanguage } from '../util/requestLanguage';
import { created, ok, paginated } from '../util/response';

export const createTicketOrder: RequestHandler = async (req, res) => {
  const { 'idempotency-key': idempotencyKey } = purchaseHeaders.parse(req.headers);
  const { order, replayed } = await orderService.createTicketOrder(
    req.user!.id,
    req.body as CreateTicketOrderBody,
    requestLanguage(req),
    idempotencyKey,
  );
  if (replayed) ok(res, order);
  else created(res, order);
};

export const createBookingOrder: RequestHandler = async (req, res) => {
  const { 'idempotency-key': idempotencyKey } = purchaseHeaders.parse(req.headers);
  const { order, replayed } = await orderService.createBookingOrder(
    req.user!.id,
    req.body as CreateBookingOrderBody,
    requestLanguage(req),
    idempotencyKey,
  );
  if (replayed) ok(res, order);
  else created(res, order);
};

export const createSlotOrder: RequestHandler = async (req, res) => {
  const { 'idempotency-key': idempotencyKey } = purchaseHeaders.parse(req.headers);
  const { order, replayed } = await orderService.createSlotOrder(
    req.user!.id,
    req.body as CreateSlotOrderBody,
    requestLanguage(req),
    idempotencyKey,
  );
  if (replayed) ok(res, order);
  else created(res, order);
};

export const getOne: RequestHandler = async (req, res) => {
  ok(res, await orderService.getOrder(String(req.params.id), req.user!, requestLanguage(req)));
};

export const verify: RequestHandler = async (req, res) => {
  ok(res, await orderService.verifyOrder(String(req.params.id), req.user!, requestLanguage(req)));
};

export const listMine: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListMyOrdersQuery;
  const { items, total } = await orderService.listMyOrders(req.user!.id, query, requestLanguage(req));
  paginated(res, items, query, total);
};
