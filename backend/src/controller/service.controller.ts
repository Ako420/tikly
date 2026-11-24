import type { RequestHandler } from 'express';
import type { CreateServiceBody, ListServicesQuery, UpdateServiceBody } from '../schema/service.schema';
import { findMyProvider } from '../service/provider.service';
import * as serviceService from '../service/service.service';
import { created, ok, paginated } from '../util/response';

export const list: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListServicesQuery;
  const { items, total } = await serviceService.listServices(query);
  paginated(res, items, query, total);
};

export const getOne: RequestHandler = async (req, res) => {
  ok(res, await serviceService.getService(String(req.params.id), req.user));
};

export const create: RequestHandler = async (req, res) => {
  const provider = await findMyProvider(req.user!.id);
  created(res, await serviceService.createService(provider, req.body as CreateServiceBody));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await serviceService.updateService(req.service!, req.body as UpdateServiceBody));
};

export const remove: RequestHandler = async (req, res) => {
  await serviceService.deactivateService(req.service!);
  ok(res, null);
};
