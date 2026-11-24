import type { Request, RequestHandler } from 'express';
import type {
  CreateAgendaItemBody,
  CreateBudgetItemBody,
  CreateChecklistItemBody,
  CreateGuestBody,
  ListGuestsQuery,
  UpdateAgendaItemBody,
  UpdateBudgetItemBody,
  UpdateChecklistItemBody,
  UpdateGuestBody,
} from '../schema/planning.schema';
import * as planning from '../service/planning.service';
import { created, ok, paginated } from '../util/response';

const itemId = (req: Request) => String(req.params.itemId);
const guestId = (req: Request) => String(req.params.guestId);

export const getBudget: RequestHandler = async (req, res) => {
  ok(res, await planning.getBudget(req.event!));
};

export const createBudgetItem: RequestHandler = async (req, res) => {
  created(res, await planning.createBudgetItem(req.event!, req.body as CreateBudgetItemBody));
};

export const updateBudgetItem: RequestHandler = async (req, res) => {
  ok(res, await planning.updateBudgetItem(req.event!, itemId(req), req.body as UpdateBudgetItemBody));
};

export const deleteBudgetItem: RequestHandler = async (req, res) => {
  await planning.deleteBudgetItem(req.event!, itemId(req));
  ok(res, null);
};

export const getChecklist: RequestHandler = async (req, res) => {
  ok(res, await planning.getChecklist(req.event!));
};

export const createChecklistItem: RequestHandler = async (req, res) => {
  created(res, await planning.createChecklistItem(req.event!, req.body as CreateChecklistItemBody));
};

export const updateChecklistItem: RequestHandler = async (req, res) => {
  ok(res, await planning.updateChecklistItem(req.event!, itemId(req), req.body as UpdateChecklistItemBody));
};

export const deleteChecklistItem: RequestHandler = async (req, res) => {
  await planning.deleteChecklistItem(req.event!, itemId(req));
  ok(res, null);
};

export const listGuests: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListGuestsQuery;
  const { items, total } = await planning.listGuests(req.event!, query);
  paginated(res, items, query, total);
};

export const createGuest: RequestHandler = async (req, res) => {
  created(res, await planning.createGuest(req.event!, req.body as CreateGuestBody));
};

export const importBuyers: RequestHandler = async (req, res) => {
  ok(res, await planning.importBuyers(req.event!));
};

export const updateGuest: RequestHandler = async (req, res) => {
  ok(res, await planning.updateGuest(req.event!, guestId(req), req.body as UpdateGuestBody));
};

export const deleteGuest: RequestHandler = async (req, res) => {
  await planning.deleteGuest(req.event!, guestId(req));
  ok(res, null);
};

export const listAgenda: RequestHandler = async (req, res) => {
  ok(res, await planning.listAgenda(String(req.params.eventId), req.user));
};

export const createAgendaItem: RequestHandler = async (req, res) => {
  created(res, await planning.createAgendaItem(req.event!, req.body as CreateAgendaItemBody));
};

export const updateAgendaItem: RequestHandler = async (req, res) => {
  ok(res, await planning.updateAgendaItem(req.event!, itemId(req), req.body as UpdateAgendaItemBody));
};

export const deleteAgendaItem: RequestHandler = async (req, res) => {
  await planning.deleteAgendaItem(req.event!, itemId(req));
  ok(res, null);
};
