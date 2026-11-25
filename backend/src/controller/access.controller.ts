import type { RequestHandler } from 'express';
import type { LookupQuery, ReentryBody, ScanBody } from '../schema/access.schema';
import * as accessService from '../service/access.service';
import { ok } from '../util/response';

export const scan: RequestHandler = async (req, res) => {
  ok(res, await accessService.scan(req.user!.id, req.event!, req.body as ScanBody));
};

export const reentry: RequestHandler = async (req, res) => {
  ok(res, await accessService.recordReentry(req.user!.id, req.event!, String(req.params.id), req.body as ReentryBody));
};

export const lookup: RequestHandler = async (req, res) => {
  ok(res, await accessService.lookup(req.event!, req.validatedQuery as LookupQuery));
};

export const checkins: RequestHandler = async (req, res) => {
  ok(res, await accessService.checkInCounts(req.event!));
};
