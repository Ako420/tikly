import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { BUDGET_SOURCES } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const budgetItemSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    label: {
      type: String,
      required: [true, 'validation.budgetItem.label.required'],
      trim: true,
      maxlength: [150, 'validation.budgetItem.label.maxLength'],
    },
    category: {
      type: String,
      required: [true, 'validation.budgetItem.category.required'],
      trim: true,
      maxlength: [60, 'validation.budgetItem.category.maxLength'],
    },
    planned: {
      type: Number,
      required: [true, 'validation.budgetItem.planned.required'],
      min: [0, 'validation.budgetItem.planned.min'],
      validate: integer('validation.common.amount.integer'),
    },
    actual: {
      type: Number,
      default: 0,
      min: [0, 'validation.budgetItem.actual.min'],
      validate: integer('validation.common.amount.integer'),
    },
    source: {
      type: String,
      enum: { values: BUDGET_SOURCES, message: 'validation.budgetItem.source.invalid' },
      default: 'manual',
    },
    bookingId: ref('Booking', 'validation.budgetItem.bookingId.required', false),
  },
  schemaOptions,
);

budgetItemSchema.pre<BudgetItemDoc>('validate', function () {
  if (this.source === 'service' && !this.bookingId) {
    this.invalidate('bookingId', 'validation.budgetItem.bookingId.required');
  }
});

budgetItemSchema.index({ eventId: 1, createdAt: 1 });
budgetItemSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: true } } });

export type BudgetItem = InferSchemaType<typeof budgetItemSchema>;
export type BudgetItemDoc = HydratedDocument<BudgetItem>;
export const BudgetItemModel = model('BudgetItem', budgetItemSchema);
