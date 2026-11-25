import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { SLOT_BOOKING_STATUSES } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const slotBookingSchema = new Schema(
  {
    slotId: ref('Slot', 'validation.slotBooking.slotId.required'),
    exhibitorId: ref('User', 'validation.slotBooking.exhibitorId.required'),
    orderId: ref('Order', 'validation.slotBooking.orderId.required'),
    quantity: {
      type: Number,
      required: [true, 'validation.slotBooking.quantity.required'],
      min: [1, 'validation.slotBooking.quantity.min'],
      validate: integer('validation.common.quantity.integer'),
    },
    status: {
      type: String,
      enum: { values: SLOT_BOOKING_STATUSES, message: 'validation.slotBooking.status.invalid' },
      default: 'pending',
    },
  },
  schemaOptions,
);

slotBookingSchema.index({ orderId: 1 }, { unique: true });
slotBookingSchema.index({ slotId: 1, status: 1 });
slotBookingSchema.index({ exhibitorId: 1, createdAt: -1 });

export type SlotBooking = InferSchemaType<typeof slotBookingSchema>;
export type SlotBookingDoc = HydratedDocument<SlotBooking>;
export const SlotBookingModel = model('SlotBooking', slotBookingSchema);
