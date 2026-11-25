import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { MAX_TICKETS_PER_ORDER } from '../config/constants';
import { ORDER_ITEM_MODELS, ORDER_STATUSES, ORDER_TYPES } from '../types/enums';
import { PHONE_REGEX, integer, ref, schemaOptions } from './shared';

const orderItemSchema = new Schema(
  {
    refId: {
      type: Schema.Types.ObjectId,
      required: [true, 'validation.order.items.refId.required'],
      refPath: 'items.refModel',
    },
    refModel: {
      type: String,
      enum: { values: ORDER_ITEM_MODELS, message: 'validation.order.items.refModel.invalid' },
      required: [true, 'validation.order.items.refModel.required'],
    },
    quantity: {
      type: Number,
      required: [true, 'validation.order.items.quantity.required'],
      min: [1, 'validation.order.items.quantity.min'],
      validate: integer('validation.common.quantity.integer'),
    },
    unitPrice: {
      type: Number,
      required: [true, 'validation.order.items.unitPrice.required'],
      min: [0, 'validation.order.items.unitPrice.min'],
      validate: integer('validation.common.amount.integer'),
    },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    type: {
      type: String,
      enum: { values: ORDER_TYPES, message: 'validation.order.type.invalid' },
      required: [true, 'validation.order.type.required'],
      immutable: true,
    },
    buyerId: ref('User', 'validation.order.buyerId.required'),
    payeeId: ref('User', 'validation.order.payeeId.required'),
    eventId: ref('Event', 'validation.common.eventId.required', false),
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: 'validation.order.items.required',
      },
    },
    amount: {
      type: Number,
      required: [true, 'validation.order.amount.required'],
      min: [0, 'validation.order.amount.min'],
      validate: integer('validation.common.amount.integer'),
    },
    phone: { type: String, trim: true, match: [PHONE_REGEX, 'validation.order.phone.invalid'] },
    status: {
      type: String,
      enum: { values: ORDER_STATUSES, message: 'validation.order.status.invalid' },
      default: 'pending',
    },
    expiresAt: { type: Date },
    paidAt: { type: Date },
    idempotencyKey: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9_-]{8,100}$/, 'validation.order.idempotencyKey.invalid'],
    },
    paymentUncertain: { type: Boolean },
  },
  schemaOptions,
);

orderSchema.pre<OrderDoc>('validate', function () {
  if (this.amount > 0 && !this.phone) this.invalidate('phone', 'validation.order.phone.required');
  if (this.status === 'pending' && !this.expiresAt) this.invalidate('expiresAt', 'validation.order.expiresAt.required');
  if (this.type === 'ticket') {
    const seats = this.items.reduce((total, item) => total + item.quantity, 0);
    if (seats > MAX_TICKETS_PER_ORDER) this.invalidate('items', 'validation.order.items.maxTickets');
    if (!this.eventId) this.invalidate('eventId', 'validation.common.eventId.required');
  }
});

orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ eventId: 1, status: 1 });
orderSchema.index(
  { buyerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
orderSchema.index(
  { status: 1, paymentUncertain: 1, createdAt: -1 },
  { partialFilterExpression: { paymentUncertain: true } },
);

export type Order = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<Order>;
export const OrderModel = model('Order', orderSchema);
