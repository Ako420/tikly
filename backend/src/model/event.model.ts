import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { EVENT_STATUSES } from '../types/enums';
import { URL_REGEX, bilingualText, hasText, ref, schemaOptions } from './shared';

const eventSchema = new Schema(
  {
    organizerId: ref('User', 'validation.event.organizerId.required'),
    title: {
      type: bilingualText(150, 'validation.event.title.maxLength'),
      required: [true, 'validation.event.title.required'],
      validate: { validator: hasText, message: 'validation.event.title.required' },
    },
    description: {
      type: bilingualText(5000, 'validation.event.description.maxLength'),
      required: [true, 'validation.event.description.required'],
      validate: { validator: hasText, message: 'validation.event.description.required' },
    },
    category: {
      type: String,
      required: [true, 'validation.event.category.required'],
      trim: true,
      lowercase: true,
    },
    coverUrl: { type: String, trim: true, match: [URL_REGEX, 'validation.event.coverUrl.invalid'] },
    venue: {
      type: String,
      required: [true, 'validation.event.venue.required'],
      trim: true,
      maxlength: [200, 'validation.event.venue.maxLength'],
    },
    city: {
      type: String,
      required: [true, 'validation.event.city.required'],
      trim: true,
      maxlength: [100, 'validation.event.city.maxLength'],
    },
    country: {
      type: String,
      required: [true, 'validation.event.country.required'],
      trim: true,
      maxlength: [100, 'validation.event.country.maxLength'],
    },
    startAt: { type: Date, required: [true, 'validation.event.startAt.required'] },
    endAt: { type: Date, required: [true, 'validation.event.endAt.required'] },
    status: {
      type: String,
      enum: { values: EVENT_STATUSES, message: 'validation.event.status.invalid' },
      default: 'draft',
    },
    rejectionReason: { type: String, trim: true, maxlength: [500, 'validation.event.rejectionReason.maxLength'] },
    cancellationReason: { type: String, trim: true, maxlength: [500, 'validation.event.cancellationReason.maxLength'] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  schemaOptions,
);

eventSchema.pre<EventDoc>('validate', function () {
  if (this.isModified('startAt') && this.startAt && this.startAt <= new Date()) {
    this.invalidate('startAt', 'validation.event.startAt.future');
  }
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'validation.event.endAt.afterStart');
  }
  if (this.status === 'rejected' && !this.rejectionReason) {
    this.invalidate('rejectionReason', 'validation.event.rejectionReason.required');
  }
  if (this.status === 'cancelled' && !this.cancellationReason) {
    this.invalidate('cancellationReason', 'validation.event.cancellationReason.required');
  }
});

eventSchema.index({ status: 1, startAt: 1, city: 1 });
eventSchema.index({ organizerId: 1, status: 1 });
eventSchema.index(
  { 'title.en': 'text', 'title.fr': 'text', 'description.en': 'text', 'description.fr': 'text' },
  { name: 'event_text', default_language: 'none' },
);

export type Event = InferSchemaType<typeof eventSchema>;
export type EventDoc = HydratedDocument<Event>;
export const EventModel = model('Event', eventSchema);
