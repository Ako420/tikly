import type { RequestHandler } from 'express';
import type {
  CancelEventBody,
  CreateEventBody,
  ListEventsQuery,
  OrganizerEventsQuery,
  UpdateEventBody,
} from '../schema/event.schema';
import * as eventService from '../service/event.service';
import { getCategories } from '../service/setting.service';
import { requestLanguage } from '../util/requestLanguage';
import { created, ok, paginated } from '../util/response';

export const listPublic: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListEventsQuery;
  const { items, total } = await eventService.listPublicEvents(query);
  paginated(res, items, query, total);
};

export const listMine: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as OrganizerEventsQuery;
  const { items, total } = await eventService.listOrganizerEvents(req.user!.id, query);
  paginated(res, items, query, total);
};

export const getOne: RequestHandler = async (req, res) => {
  ok(res, await eventService.getEventDetails(String(req.params.id), req.user));
};

export const create: RequestHandler = async (req, res) => {
  created(res, await eventService.createEvent(req.user!.id, req.body as CreateEventBody));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await eventService.updateEvent(req.event!, req.body as UpdateEventBody));
};

export const remove: RequestHandler = async (req, res) => {
  await eventService.deleteEvent(req.event!);
  ok(res, null);
};

export const submit: RequestHandler = async (req, res) => {
  ok(res, await eventService.submitForApproval(req.event!));
};

export const cancel: RequestHandler = async (req, res) => {
  ok(res, await eventService.cancelEvent(req.event!, (req.body as CancelEventBody).reason));
};

export const stats: RequestHandler = async (req, res) => {
  ok(res, await eventService.getEventStats(req.event!));
};

export const share: RequestHandler = async (req, res) => {
  ok(res, await eventService.getShareLinks(String(req.params.id), requestLanguage(req)));
};

export const categories: RequestHandler = async (_req, res) => {
  ok(res, await getCategories());
};
