import type { FilterQuery } from 'mongoose';
import { ProviderModel, ServiceModel, type ProviderDoc, type Service, type ServiceDoc } from '../model';
import type { CreateServiceBody, ListServicesQuery, UpdateServiceBody } from '../schema/service.schema';
import type { Role } from '../types/enums';
import type { Page } from '../util/pagination';
import { AppError } from '../util/AppError';
import { toProviderContact, toProviderSummary, toServiceView } from '../util/catalogView';
import { skipFor } from '../util/pagination';
import { exactInsensitive } from '../util/regex';

type Viewer = { id: string; role: Role } | undefined;

const verifiedProviderIds = () => ProviderModel.find({ verification: 'verified' }).distinct('_id');

export async function listServices(query: ListServicesQuery) {
  const filter: FilterQuery<Service> = { active: true, providerId: { $in: await verifiedProviderIds() } };
  if (query.category) filter.category = query.category;
  if (query.city) filter.city = exactInsensitive(query.city);
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {
      ...(query.minPrice !== undefined && { $gte: query.minPrice }),
      ...(query.maxPrice !== undefined && { $lte: query.maxPrice }),
    };
  }
  if (query.q) filter.$text = { $search: query.q };

  const [services, total] = await Promise.all([
    ServiceModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
    ServiceModel.countDocuments(filter),
  ]);
  const providers = await ProviderModel.find({ _id: { $in: services.map((service) => service.providerId) } }).lean();
  const byId = new Map(providers.map((provider) => [String(provider._id), provider]));
  const items = services.map((service) => {
    const provider = byId.get(String(service.providerId));
    return { ...toServiceView(service), provider: provider ? toProviderSummary(provider) : null };
  });
  return { items, total };
}

export async function getService(serviceId: string, viewer: Viewer) {
  const service = await ServiceModel.findById(serviceId).lean();
  if (!service) throw AppError.notFound();
  const provider = await ProviderModel.findById(service.providerId).lean();
  if (!provider) throw AppError.notFound();
  const isOwner = viewer !== undefined && String(provider.userId) === viewer.id;
  const listed = service.active && provider.verification === 'verified';
  if (!listed && !isOwner && viewer?.role !== 'admin') throw AppError.notFound();
  return { ...toServiceView(service), provider: toProviderContact(provider) };
}

export async function createService(provider: ProviderDoc | null, input: CreateServiceBody) {
  if (!provider || provider.verification !== 'verified') throw AppError.forbidden('PROVIDER_NOT_VERIFIED');
  const service = await ServiceModel.create({ ...input, providerId: provider._id });
  return toServiceView(service);
}

export async function updateService(service: ServiceDoc, input: UpdateServiceBody) {
  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) service.set(field, value);
  }
  await service.save();
  return toServiceView(service);
}

export async function deactivateService(service: ServiceDoc) {
  service.active = false;
  await service.save();
}

export async function listMyServices(userId: string, page: Page) {
  const provider = await ProviderModel.findOne({ userId }).select('_id').lean();
  if (!provider) return { items: [], total: 0 };
  const filter = { providerId: provider._id, active: true };
  const [services, total] = await Promise.all([
    ServiceModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(page.limit).lean(),
    ServiceModel.countDocuments(filter),
  ]);
  return { items: services.map(toServiceView), total };
}
