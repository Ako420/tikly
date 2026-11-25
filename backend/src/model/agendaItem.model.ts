import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ref, schemaOptions } from './shared';

const agendaItemSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    title: {
      type: String,
      required: [true, 'validation.agendaItem.title.required'],
      trim: true,
      maxlength: [150, 'validation.agendaItem.title.maxLength'],
    },
    startAt: { type: Date, required: [true, 'validation.agendaItem.startAt.required'] },
    endAt: { type: Date, required: [true, 'validation.agendaItem.endAt.required'] },
    speaker: { type: String, trim: true, maxlength: [100, 'validation.agendaItem.speaker.maxLength'] },
    location: { type: String, trim: true, maxlength: [100, 'validation.agendaItem.location.maxLength'] },
  },
  schemaOptions,
);

agendaItemSchema.pre<AgendaItemDoc>('validate', function () {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate('endAt', 'validation.agendaItem.endAt.afterStart');
  }
});

agendaItemSchema.index({ eventId: 1, startAt: 1 });

export type AgendaItem = InferSchemaType<typeof agendaItemSchema>;
export type AgendaItemDoc = HydratedDocument<AgendaItem>;
export const AgendaItemModel = model('AgendaItem', agendaItemSchema);
