import { OrderModel, ProviderModel, ServiceModel, TransactionModel, type ProviderDoc } from '../model';
import type { CreateProviderBody, EarningsQuery, UpdateProviderBody } from '../schema/provider.schema';
import { AppError } from '../util/AppError';
import { toProviderContact, toServiceView } from '../util/catalogView';
import { notifyAdmins } from './notification.service';
import { getCommissionRate } from './setting.service';

const sameDocuments = (current: string[], next: string[]) =>
  current.length === next.length && next.every((id) => current.includes(id));

async function askForVerification(provider: ProviderDoc) {
  await notifyAdmins('provider_pending', { providerId: provider.id, businessName: provider.businessName });
}

export function findMyProvider(userId: string) {
  return ProviderModel.findOne({ userId });
}

export async function getMyProvider(userId: string) {
  const provider = await findMyProvider(userId);
  if (!provider) throw AppError.notFound();
  return provider;
}

export async function getMyProfile(userId: string) {
  const [provider, commissionPercent] = await Promise.all([getMyProvider(userId), getCommissionRate('service')]);
  return { ...provider.toJSON(), commissionPercent };
}

export async function createProvider(userId: string, input: CreateProviderBody) {
  if (await ProviderModel.exists({ userId })) throw AppError.conflict('PROVIDER_EXISTS');
  const provider = await ProviderModel.create({ ...input, userId, verification: 'pending' });
  await askForVerification(provider);
  return provider;
}

export async function updateProvider(userId: string, input: UpdateProviderBody) {
  const provider = await getMyProvider(userId);
  const { documents, ...details } = input;
  for (const [field, value] of Object.entries(details)) {
    if (value !== undefined) provider.set(field, value);
  }

  const documentsChanged = documents !== undefined && !sameDocuments(provider.documents, documents);
  if (documents !== undefined) provider.documents = documents;
  const resubmit = documentsChanged || provider.verification === 'rejected';
  const needsReview = resubmit && provider.verification !== 'pending';
  if (resubmit) {
    provider.verification = 'pending';
    provider.rejectionReason = undefined;
  }
  await provider.save();
  if (needsReview) await askForVerification(provider);
  return provider;
}

export async function getPublicProvider(providerId: string) {
  const provider = await ProviderModel.findOne({ _id: providerId, verification: 'verified' }).lean();
  if (!provider) throw AppError.notFound();
  const services = await ServiceModel.find({ providerId: provider._id, active: true })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return {
    ...toProviderContact(provider),
    services: services.map(toServiceView),
  };
}

export async function getEarnings(userId: string, query: EarningsQuery) {
  const orderIds = await OrderModel.find({ type: 'service', payeeId: userId }).distinct('_id');
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (query.from) createdAt.$gte = query.from;
  if (query.to) createdAt.$lte = query.to;

  const rows = await TransactionModel.aggregate<{
    _id: 'payment' | 'refund';
    count: number;
    amount: number;
    commission: number;
    payeeShare: number;
  }>([
    {
      $match: {
        orderId: { $in: orderIds },
        status: 'successful',
        ...(Object.keys(createdAt).length && { createdAt }),
      },
    },
    {
      $group: {
        _id: '$kind',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        commission: { $sum: '$commission' },
        payeeShare: { $sum: '$payeeShare' },
      },
    },
  ]);
  const payments = rows.find((row) => row._id === 'payment');
  const refunds = rows.find((row) => row._id === 'refund');
  return {
    from: query.from ?? null,
    to: query.to ?? null,
    paidBookings: payments?.count ?? 0,
    gross: payments?.amount ?? 0,
    commission: payments?.commission ?? 0,
    net: payments?.payeeShare ?? 0,
    refunded: refunds?.amount ?? 0,
  };
}
