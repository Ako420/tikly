import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { schemaOptions } from './shared';

const commissionRate = (message: string) => ({
  type: Number,
  min: [0, message],
  max: [30, message],
});

const categorySchema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'validation.setting.categories.key.required'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'validation.setting.categories.key.invalid'],
    },
    en: { type: String, required: [true, 'validation.setting.categories.en.required'], trim: true },
    fr: { type: String, required: [true, 'validation.setting.categories.fr.required'], trim: true },
  },
  { _id: false },
);

const settingSchema = new Schema(
  {
    commission: {
      ticket: commissionRate('validation.setting.commission.range'),
      service: commissionRate('validation.setting.commission.range'),
      slot: commissionRate('validation.setting.commission.range'),
    },
    categories: {
      type: [categorySchema],
      default: [],
      validate: {
        validator: (categories: { key: string }[]) => new Set(categories.map((c) => c.key)).size === categories.length,
        message: 'validation.setting.categories.duplicate',
      },
    },
  },
  schemaOptions,
);

export type Setting = InferSchemaType<typeof settingSchema>;
export type SettingDoc = HydratedDocument<Setting>;
export const SettingModel = model('Setting', settingSchema);
