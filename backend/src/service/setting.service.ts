import { DEFAULT_COMMISSION_PERCENT, DEFAULT_EVENT_CATEGORIES } from '../config/constants';
import { SettingModel } from '../model/setting.model';
import type { UpdateSettingsBody } from '../schema/admin.schema';
import type { OrderType } from '../types/enums';
import { AppError } from '../util/AppError';

export type Category = { key: string; en: string; fr: string };

export async function getCategories(): Promise<Category[]> {
  const settings = await SettingModel.findOne().select('categories').lean();
  const saved = settings?.categories ?? [];
  return saved.length
    ? saved.map(({ key, en, fr }) => ({ key, en, fr }))
    : DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c }));
}

export async function assertCategory(key: string) {
  const categories = await getCategories();
  const allowed = categories.map((category) => category.key);
  if (!allowed.includes(key)) throw AppError.badRequest('INVALID_CATEGORY', { allowed });
}

export async function getCommissionRate(type: OrderType): Promise<number> {
  const settings = await SettingModel.findOne().select('commission').lean();
  return settings?.commission?.[type] ?? DEFAULT_COMMISSION_PERCENT[type];
}

export async function getSettings() {
  const settings = await SettingModel.findOne().select('commission').lean();
  const commission = Object.fromEntries(
    (Object.keys(DEFAULT_COMMISSION_PERCENT) as OrderType[]).map((type) => [
      type,
      settings?.commission?.[type] ?? DEFAULT_COMMISSION_PERCENT[type],
    ]),
  ) as Record<OrderType, number>;
  return { commission, categories: await getCategories() };
}

export async function updateSettings(input: UpdateSettingsBody) {
  const changes: Record<string, unknown> = {};
  for (const [type, rate] of Object.entries(input.commission ?? {})) {
    if (rate !== undefined) changes[`commission.${type}`] = rate;
  }
  if (input.categories) changes.categories = input.categories;
  await SettingModel.findOneAndUpdate({}, { $set: changes }, { upsert: true, runValidators: true });
  return getSettings();
}
