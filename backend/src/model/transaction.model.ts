import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { PAYMENT_PROVIDERS, TRANSACTION_KINDS, TRANSACTION_STATUSES } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const transactionSchema = new Schema(
  {
    orderId: ref('Order', 'validation.transaction.orderId.required'),
    payeeId: ref('User', 'validation.transaction.payeeId.required', false),
    provider: {
      type: String,
      enum: { values: PAYMENT_PROVIDERS, message: 'validation.transaction.provider.invalid' },
      required: [true, 'validation.transaction.provider.required'],
    },
    externalRef: { type: String, required: [true, 'validation.transaction.externalRef.required'], trim: true },
    kind: {
      type: String,
      enum: { values: TRANSACTION_KINDS, message: 'validation.transaction.kind.invalid' },
      required: [true, 'validation.transaction.kind.required'],
    },
    amount: {
      type: Number,
      required: [true, 'validation.transaction.amount.required'],
      min: [0, 'validation.transaction.amount.min'],
      validate: integer('validation.common.amount.integer'),
    },
    payeeShare: { type: Number, default: 0, min: 0, validate: integer('validation.common.amount.integer') },
    commission: { type: Number, default: 0, min: 0, validate: integer('validation.common.amount.integer') },
    status: {
      type: String,
      enum: { values: TRANSACTION_STATUSES, message: 'validation.transaction.status.invalid' },
      default: 'pending',
    },
    raw: { type: Schema.Types.Mixed },
  },
  schemaOptions,
);

transactionSchema.pre<TransactionDoc>('validate', function () {
  if (this.payeeShare + this.commission > this.amount) {
    this.invalidate('commission', 'validation.transaction.split.exceedsAmount');
  }
});

transactionSchema.index({ externalRef: 1 }, { unique: true });
transactionSchema.index({ orderId: 1, kind: 1 });
transactionSchema.index({ payeeId: 1, status: 1 });

export type Transaction = InferSchemaType<typeof transactionSchema>;
export type TransactionDoc = HydratedDocument<Transaction>;
export const TransactionModel = model('Transaction', transactionSchema);
