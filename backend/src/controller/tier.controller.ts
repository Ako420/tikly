import type { RequestHandler } from 'express';
import type { CreateTierBody, UpdateTierBody } from '../schema/tier.schema';
import * as tierService from '../service/tier.service';
import { created, ok } from '../util/response';

export const list: RequestHandler = async (req, res) => {
  ok(res, await tierService.listTiers(String(req.params.eventId), req.user));
};

export const create: RequestHandler = async (req, res) => {
  created(res, await tierService.createTier(req.event!, req.body as CreateTierBody));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await tierService.updateTier(req.tier!, req.event!, req.body as UpdateTierBody));
};

export const remove: RequestHandler = async (req, res) => {
  await tierService.deleteTier(req.tier!);
  ok(res, null);
};
