import type { RequestHandler } from 'express';
import type {
  AdminEventsQuery,
  AdminProvidersQuery,
  AdminUsersQuery,
  StatsQuery,
  UpdateSettingsBody,
} from '../schema/admin.schema';
import * as adminService from '../service/admin.service';
import { getSettings, updateSettings } from '../service/setting.service';
import { ok, paginated } from '../util/response';

const id = (req: { params: Record<string, unknown> }) => String(req.params.id);

export const listEvents: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as AdminEventsQuery;
  const { items, total } = await adminService.listEvents(query);
  paginated(res, items, query, total);
};

export const approveEvent: RequestHandler = async (req, res) => {
  ok(res, await adminService.approveEvent(id(req)));
};

export const rejectEvent: RequestHandler = async (req, res) => {
  ok(res, await adminService.rejectEvent(id(req), (req.body as { reason: string }).reason));
};

export const setEventStatus: RequestHandler = async (req, res) => {
  ok(res, await adminService.setEventStatus(id(req), (req.body as { status: 'published' | 'suspended' }).status));
};

export const listProviders: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as AdminProvidersQuery;
  const { items, total } = await adminService.listProviders(query);
  paginated(res, items, query, total);
};

export const getProvider: RequestHandler = async (req, res) => {
  ok(res, await adminService.getProvider(id(req)));
};

export const verifyProvider: RequestHandler = async (req, res) => {
  ok(res, await adminService.verifyProvider(id(req)));
};

export const rejectProvider: RequestHandler = async (req, res) => {
  ok(res, await adminService.rejectProvider(id(req), (req.body as { reason: string }).reason));
};

export const listUsers: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as AdminUsersQuery;
  const { items, total } = await adminService.listUsers(query);
  paginated(res, items, query, total);
};

export const setUserStatus: RequestHandler = async (req, res) => {
  const { status } = req.body as { status: 'active' | 'suspended' };
  ok(res, await adminService.setUserStatus(req.user!.id, id(req), status));
};

export const setServiceStatus: RequestHandler = async (req, res) => {
  ok(res, await adminService.setServiceActive(id(req), (req.body as { active: boolean }).active));
};

export const hideReview: RequestHandler = async (req, res) => {
  ok(res, await adminService.setReviewHidden(id(req), (req.body as { hidden: boolean }).hidden));
};

export const stats: RequestHandler = async (req, res) => {
  ok(res, await adminService.getStats(req.validatedQuery as StatsQuery));
};

export const settings: RequestHandler = async (_req, res) => {
  ok(res, await getSettings());
};

export const changeSettings: RequestHandler = async (req, res) => {
  ok(res, await updateSettings(req.body as UpdateSettingsBody));
};
