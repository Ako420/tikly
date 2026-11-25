import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { integer, ref, schemaOptions } from './shared';

const slotSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    label: {
      type: String,
      required: [true, 'validation.slot.label.required'],
      trim: true,
      maxlength: [100, 'validation.slot.label.maxLength'],
    },
    size: { type: String, trim: true, maxlength: [100, 'validation.slot.size.maxLength'] },
    price: {
      type: Number,
      required: [true, 'validation.slot.price.required'],
      min: [0, 'validation.slot.price.min'],
      validate: integer('validation.common.amount.integer'),
    },
    quantity: {
      type: Number,
      required: [true, 'validation.slot.quantity.required'],
      min: [1, 'validation.slot.quantity.min'],
      validate: integer('validation.common.quantity.integer'),
    },
    reserved: { type: Number, default: 0, min: 0 },
    booked: { type: Number, default: 0, min: 0 },
  },
  schemaOptions,
);

slotSchema.pre<SlotDoc>('validate', function () {
  if (this.quantity != null && this.booked + this.reserved > this.quantity) {
    this.invalidate('quantity', 'validation.slot.quantity.belowBooked');
  }
});

slotSchema.index({ eventId: 1 });

export type Slot = InferSchemaType<typeof slotSchema>;
export type SlotDoc = HydratedDocument<Slot>;
export const SlotModel = model('Slot', slotSchema);
