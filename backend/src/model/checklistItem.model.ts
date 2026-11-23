import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ref, schemaOptions } from './shared';

const checklistItemSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    title: {
      type: String,
      required: [true, 'validation.checklistItem.title.required'],
      trim: true,
      maxlength: [200, 'validation.checklistItem.title.maxLength'],
    },
    dueAt: { type: Date },
    done: { type: Boolean, default: false },
  },
  schemaOptions,
);

checklistItemSchema.index({ eventId: 1, dueAt: 1 });

export type ChecklistItem = InferSchemaType<typeof checklistItemSchema>;
export type ChecklistItemDoc = HydratedDocument<ChecklistItem>;
export const ChecklistItemModel = model('ChecklistItem', checklistItemSchema);
