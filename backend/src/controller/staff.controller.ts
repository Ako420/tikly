import type { RequestHandler } from 'express';
import type { CreateStaffBody, UpdateStaffBody } from '../schema/staff.schema';
import * as staffService from '../service/staff.service';
import { created, ok } from '../util/response';

export const create: RequestHandler = async (req, res) => {
  created(res, await staffService.createStaff(req.user!.id, req.body as CreateStaffBody));
};

export const list: RequestHandler = async (req, res) => {
  ok(res, await staffService.listStaff(req.user!.id));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await staffService.updateStaff(req.staff!, req.body as UpdateStaffBody));
};

export const disable: RequestHandler = async (req, res) => {
  await staffService.disableStaff(req.staff!);
  ok(res, null);
};

export const assign: RequestHandler = async (req, res) => {
  created(res, await staffService.assignStaff(req.event!, (req.body as { staffId: string }).staffId));
};

export const unassign: RequestHandler = async (req, res) => {
  await staffService.unassignStaff(req.event!, String(req.params.staffId));
  ok(res, null);
};

export const myEvents: RequestHandler = async (req, res) => {
  ok(res, await staffService.listAssignedEvents(req.user!.id));
};
