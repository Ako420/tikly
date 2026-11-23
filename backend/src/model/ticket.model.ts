import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { CHECK_IN_TYPES, TICKET_STATUSES } from '../types/enums';
import { ref, schemaOptions } from './shared';

const checkInSchema = new Schema(
  {
    at: { type: Date, required: [true, 'validation.ticket.checkIns.at.required'], default: Date.now },
    staffId: ref('User', 'validation.ticket.checkIns.staffId.required'),
    type: {
      type: String,
      enum: { values: CHECK_IN_TYPES, message: 'validation.ticket.checkIns.type.invalid' },
      default: 'entry',
    },
    note: { type: String, trim: true, maxlength: [300, 'validation.ticket.checkIns.note.maxLength'] },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, 'validation.ticket.code.required'],
      trim: true,
      uppercase: true,
      immutable: true,
    },
    qrToken: { type: String, required: [true, 'validation.ticket.qrToken.required'], immutable: true },
    orderId: ref('Order', 'validation.ticket.orderId.required'),
    eventId: ref('Event', 'validation.common.eventId.required'),
    tierId: ref('TicketTier', 'validation.ticket.tierId.required'),
    holderId: ref('User', 'validation.ticket.holderId.required'),
    status: {
      type: String,
      enum: { values: TICKET_STATUSES, message: 'validation.ticket.status.invalid' },
      default: 'valid',
    },
    checkIns: { type: [checkInSchema], default: [] },
  },
  schemaOptions,
);

ticketSchema.index({ code: 1 }, { unique: true });
ticketSchema.index({ eventId: 1, status: 1 });
ticketSchema.index({ holderId: 1 });
ticketSchema.index({ orderId: 1 });

export type Ticket = InferSchemaType<typeof ticketSchema>;
export type TicketDoc = HydratedDocument<Ticket>;
export const TicketModel = model('Ticket', ticketSchema);
