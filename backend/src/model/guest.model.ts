import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { GUEST_SOURCES } from '../types/enums';
import { EMAIL_REGEX, PHONE_REGEX, ref, schemaOptions } from './shared';

const guestSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    name: {
      type: String,
      required: [true, 'validation.guest.name.required'],
      trim: true,
      maxlength: [100, 'validation.guest.name.maxLength'],
    },
    phone: { type: String, trim: true, match: [PHONE_REGEX, 'validation.guest.phone.invalid'] },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL_REGEX, 'validation.guest.email.invalid'] },
    category: {
      type: String,
      required: [true, 'validation.guest.category.required'],
      trim: true,
      lowercase: true,
      maxlength: [40, 'validation.guest.category.maxLength'],
    },
    source: {
      type: String,
      enum: { values: GUEST_SOURCES, message: 'validation.guest.source.invalid' },
      default: 'manual',
    },
  },
  schemaOptions,
);

guestSchema.index({ eventId: 1, name: 1 });

export type Guest = InferSchemaType<typeof guestSchema>;
export type GuestDoc = HydratedDocument<Guest>;
export const GuestModel = model('Guest', guestSchema);
