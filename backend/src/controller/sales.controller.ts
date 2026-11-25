import type { RequestHandler } from 'express';
import type { EventAttendeesQuery, EventOrdersQuery } from '../schema/sales.schema';
import * as salesService from '../service/sales.service';
import { paginated } from '../util/response';

export const orders: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as EventOrdersQuery;
  const { items, total } = await salesService.listEventOrders(req.event!, query);
  paginated(res, items, query, total);
};

export const attendees: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as EventAttendeesQuery;
  const { items, total } = await salesService.listEventAttendees(req.event!, query);
  paginated(res, items, query, total);
};
