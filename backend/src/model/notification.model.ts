import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '../types/enums';
import { ref, schemaOptions } from './shared';

const notificationSchema = new Schema(
  {
    userId: ref('User', 'validation.notification.userId.required'),
    eventId: ref('Event', 'validation.common.eventId.required', false),
    type: {
      type: String,
      enum: { values: NOTIFICATION_TYPES, message: 'validation.notification.type.invalid' },
      required: [true, 'validation.notification.type.required'],
    },
    channels: {
      type: [{ type: String, enum: { values: NOTIFICATION_CHANNELS, message: 'validation.notification.channels.invalid' } }],
      default: ['push', 'email'],
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    sentAt: { type: Date },
    readAt: { type: Date },
  },
  schemaOptions,
);

notificationSchema.pre<NotificationDoc>('validate', function () {
  if (this.type === 'reminder_24h' && !this.eventId) this.invalidate('eventId', 'validation.common.eventId.required');
});

notificationSchema.index(
  { userId: 1, eventId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'reminder_24h' }, name: 'one_reminder_per_user_event' },
);
notificationSchema.index({ userId: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDoc = HydratedDocument<Notification>;
export const NotificationModel = model('Notification', notificationSchema);
