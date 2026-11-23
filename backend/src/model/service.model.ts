import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SERVICE_CATEGORIES, SERVICE_UNITS } from '../types/enums';
import { URL_REGEX, bilingualText, hasText, integer, ref, schemaOptions } from './shared';

const serviceSchema = new Schema(
  {
    providerId: ref('Provider', 'validation.service.providerId.required'),
    category: {
      type: String,
      enum: { values: SERVICE_CATEGORIES, message: 'validation.service.category.invalid' },
      required: [true, 'validation.service.category.required'],
    },
    title: {
      type: bilingualText(150, 'validation.service.title.maxLength'),
      required: [true, 'validation.service.title.required'],
      validate: { validator: hasText, message: 'validation.service.title.required' },
    },
    description: { type: String, trim: true, maxlength: [2000, 'validation.service.description.maxLength'] },
    photos: {
      type: [{ type: String, match: [URL_REGEX, 'validation.service.photos.invalid'] }],
      default: [],
    },
    city: {
      type: String,
      required: [true, 'validation.service.city.required'],
      trim: true,
      maxlength: [100, 'validation.service.city.maxLength'],
    },
    price: {
      type: Number,
      required: [true, 'validation.service.price.required'],
      min: [0, 'validation.service.price.min'],
      validate: integer('validation.common.amount.integer'),
    },
    unit: {
      type: String,
      enum: { values: SERVICE_UNITS, message: 'validation.service.unit.invalid' },
      required: [true, 'validation.service.unit.required'],
    },
    active: { type: Boolean, default: true },
  },
  schemaOptions,
);

serviceSchema.index({ active: 1, category: 1, city: 1 });
serviceSchema.index({ providerId: 1 });
serviceSchema.index({ 'title.en': 'text', 'title.fr': 'text', description: 'text' }, { name: 'service_text', default_language: 'none' });

export type Service = InferSchemaType<typeof serviceSchema>;
export type ServiceDoc = HydratedDocument<Service>;
export const ServiceModel = model('Service', serviceSchema);
