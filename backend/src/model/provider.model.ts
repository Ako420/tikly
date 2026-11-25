import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { VERIFICATION_STATUSES } from '../types/enums';
import { PHONE_REGEX, ref, schemaOptions } from './shared';

const providerSchema = new Schema(
  {
    userId: ref('User', 'validation.provider.userId.required'),
    businessName: {
      type: String,
      required: [true, 'validation.provider.businessName.required'],
      trim: true,
      minlength: [2, 'validation.provider.businessName.minLength'],
      maxlength: [150, 'validation.provider.businessName.maxLength'],
    },
    description: { type: String, trim: true, maxlength: [2000, 'validation.provider.description.maxLength'] },
    city: {
      type: String,
      required: [true, 'validation.provider.city.required'],
      trim: true,
      maxlength: [100, 'validation.provider.city.maxLength'],
    },
    country: {
      type: String,
      required: [true, 'validation.provider.country.required'],
      trim: true,
      maxlength: [100, 'validation.provider.country.maxLength'],
    },
    phone: {
      type: String,
      required: [true, 'validation.provider.phone.required'],
      trim: true,
      match: [PHONE_REGEX, 'validation.provider.phone.invalid'],
    },
    whatsapp: { type: String, trim: true, match: [PHONE_REGEX, 'validation.provider.whatsapp.invalid'] },
    documents: {
      type: [String],
      validate: { validator: (docs: string[]) => docs.length > 0, message: 'validation.provider.documents.required' },
    },
    verification: {
      type: String,
      enum: { values: VERIFICATION_STATUSES, message: 'validation.provider.verification.invalid' },
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true, maxlength: [500, 'validation.provider.rejectionReason.maxLength'] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  schemaOptions,
);

providerSchema.pre<ProviderDoc>('validate', function () {
  if (this.verification === 'rejected' && !this.rejectionReason) {
    this.invalidate('rejectionReason', 'validation.provider.rejectionReason.required');
  }
});

providerSchema.index({ userId: 1 }, { unique: true });
providerSchema.index({ verification: 1, city: 1 });

export type Provider = InferSchemaType<typeof providerSchema>;
export type ProviderDoc = HydratedDocument<Provider>;
export const ProviderModel = model('Provider', providerSchema);
