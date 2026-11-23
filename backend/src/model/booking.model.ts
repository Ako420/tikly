import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BOOKING_STATUSES } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const bookingSchema = new Schema(
  {
    serviceId: ref('Service', 'validation.booking.serviceId.required'),
    organizerId: ref('User', 'validation.booking.organizerId.required'),
    eventId: ref('Event', 'validation.common.eventId.required', false),
    orderId: ref('Order', 'validation.booking.orderId.required', false),
    startDate: { type: Date, required: [true, 'validation.booking.startDate.required'] },
    endDate: { type: Date, required: [true, 'validation.booking.endDate.required'] },
    quantity: {
      type: Number,
      required: [true, 'validation.booking.quantity.required'],
      min: [1, 'validation.booking.quantity.min'],
      validate: integer('validation.common.quantity.integer'),
    },
    amount: {
      type: Number,
      min: [0, 'validation.booking.amount.min'],
      validate: integer('validation.common.amount.integer'),
    },
    note: { type: String, trim: true, maxlength: [1000, 'validation.booking.note.maxLength'] },
    declineReason: { type: String, trim: true, maxlength: [500, 'validation.booking.declineReason.maxLength'] },
    status: {
      type: String,
      enum: { values: BOOKING_STATUSES, message: 'validation.booking.status.invalid' },
      default: 'requested',
    },
  },
  schemaOptions,
);

bookingSchema.pre<BookingDoc>('validate', function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'validation.booking.endDate.afterStart');
  }
  if (['accepted', 'paid', 'completed'].includes(this.status) && this.amount == null) {
    this.invalidate('amount', 'validation.booking.amount.required');
  }
});

bookingSchema.index({ organizerId: 1, status: 1 });
bookingSchema.index({ serviceId: 1, status: 1 });

export type Booking = InferSchemaType<typeof bookingSchema>;
export type BookingDoc = HydratedDocument<Booking>;
export const BookingModel = model('Booking', bookingSchema);
