import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ref, schemaOptions } from './shared';

const staffAssignmentSchema = new Schema(
  {
    staffId: ref('User', 'validation.staffAssignment.staffId.required'),
    eventId: ref('Event', 'validation.common.eventId.required'),
  },
  schemaOptions,
);

staffAssignmentSchema.index({ staffId: 1, eventId: 1 }, { unique: true });
staffAssignmentSchema.index({ eventId: 1 });

export type StaffAssignment = InferSchemaType<typeof staffAssignmentSchema>;
export type StaffAssignmentDoc = HydratedDocument<StaffAssignment>;
export const StaffAssignmentModel = model('StaffAssignment', staffAssignmentSchema);
