import type { RequestHandler } from 'express';
import type { CreateProviderBody, EarningsQuery, UpdateProviderBody } from '../schema/provider.schema';
import * as providerService from '../service/provider.service';
import * as serviceService from '../service/service.service';
import type { Page } from '../util/pagination';
import { created, ok, paginated } from '../util/response';

export const create: RequestHandler = async (req, res) => {
  created(res, await providerService.createProvider(req.user!.id, req.body as CreateProviderBody));
};

export const getMine: RequestHandler = async (req, res) => {
  ok(res, await providerService.getMyProvider(req.user!.id));
};

export const updateMine: RequestHandler = async (req, res) => {
  ok(res, await providerService.updateProvider(req.user!.id, req.body as UpdateProviderBody));
};

export const myServices: RequestHandler = async (req, res) => {
  const page = req.validatedQuery as Page;
  const { items, total } = await serviceService.listMyServices(req.user!.id, page);
  paginated(res, items, page, total);
};

export const earnings: RequestHandler = async (req, res) => {
  ok(res, await providerService.getEarnings(req.user!.id, req.validatedQuery as EarningsQuery));
};

export const getPublic: RequestHandler = async (req, res) => {
  ok(res, await providerService.getPublicProvider(String(req.params.id)));
};
