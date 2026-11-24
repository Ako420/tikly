import type { RequestHandler } from 'express';
import type { CreateSlotBody, ExhibitorEventsQuery, UpdateSlotBody } from '../schema/slot.schema';
import * as slotService from '../service/slot.service';
import type { Page } from '../util/pagination';
import { created, ok, paginated } from '../util/response';

export const list: RequestHandler = async (req, res) => {
  ok(res, await slotService.listSlots(String(req.params.eventId), req.user));
};

export const create: RequestHandler = async (req, res) => {
  created(res, await slotService.createSlot(req.event!, req.body as CreateSlotBody));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await slotService.updateSlot(req.slot!, req.event!, req.body as UpdateSlotBody));
};

export const remove: RequestHandler = async (req, res) => {
  await slotService.deleteSlot(req.slot!);
  ok(res, null);
};

export const exhibitorEvents: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ExhibitorEventsQuery;
  const { items, total } = await slotService.listExhibitorEvents(query);
  paginated(res, items, query, total);
};

export const mySlotBookings: RequestHandler = async (req, res) => {
  const page = req.validatedQuery as Page;
  const { items, total } = await slotService.listMySlotBookings(req.user!.id, page);
  paginated(res, items, page, total);
};

export const eventExhibitors: RequestHandler = async (req, res) => {
  ok(res, await slotService.listPublicExhibitors(String(req.params.eventId)));
};

export const eventSlotBookings: RequestHandler = async (req, res) => {
  ok(res, await slotService.listEventSlotBookings(req.event!));
};
