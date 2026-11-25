import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { TIER_NAMES } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const ticketTierSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    name: {
      type: String,
      enum: { values: TIER_NAMES, message: 'validation.ticketTier.name.invalid' },
      required: [true, 'validation.ticketTier.name.required'],
    },
    price: {
      type: Number,
      required: [true, 'validation.ticketTier.price.required'],
      min: [0, 'validation.ticketTier.price.min'],
      validate: integer('validation.common.amount.integer'),
    },
    quantity: {
      type: Number,
      required: [true, 'validation.ticketTier.quantity.required'],
      min: [1, 'validation.ticketTier.quantity.min'],
      validate: integer('validation.common.quantity.integer'),
    },
    reserved: { type: Number, default: 0, min: [0, 'validation.ticketTier.reserved.min'] },
    sold: { type: Number, default: 0, min: [0, 'validation.ticketTier.sold.min'] },
    salesEndAt: { type: Date, required: [true, 'validation.ticketTier.salesEndAt.required'] },
  },
  schemaOptions,
);

ticketTierSchema.pre<TicketTierDoc>('validate', function () {
  if (this.quantity != null && this.sold + this.reserved > this.quantity) {
    this.invalidate('quantity', 'validation.ticketTier.quantity.belowSold');
  }
});

ticketTierSchema.index({ eventId: 1, name: 1 }, { unique: true });

export type TicketTier = InferSchemaType<typeof ticketTierSchema>;
export type TicketTierDoc = HydratedDocument<TicketTier>;
export const TicketTierModel = model('TicketTier', ticketTierSchema);
