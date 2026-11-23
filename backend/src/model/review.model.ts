import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { REVIEW_TARGETS } from '../types/enums';
import { integer, ref, schemaOptions } from './shared';

const reviewSchema = new Schema(
  {
    target: {
      type: String,
      enum: { values: REVIEW_TARGETS, message: 'validation.review.target.invalid' },
      required: [true, 'validation.review.target.required'],
      immutable: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'validation.review.targetId.required'],
      immutable: true,
    },
    authorId: ref('User', 'validation.review.authorId.required'),
    bookingId: ref('Booking', 'validation.review.bookingId.required', false),
    rating: {
      type: Number,
      required: [true, 'validation.review.rating.required'],
      min: [1, 'validation.review.rating.range'],
      max: [5, 'validation.review.rating.range'],
      validate: integer('validation.review.rating.integer'),
    },
    comment: { type: String, trim: true, maxlength: [1000, 'validation.review.comment.maxLength'] },
    hidden: { type: Boolean, default: false },
  },
  schemaOptions,
);

reviewSchema.pre<ReviewDoc>('validate', function () {
  if (this.target === 'provider' && !this.bookingId) this.invalidate('bookingId', 'validation.review.bookingId.required');
});

reviewSchema.index(
  { targetId: 1, authorId: 1 },
  { unique: true, partialFilterExpression: { target: 'event' }, name: 'one_review_per_event_author' },
);
reviewSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: true } } });
reviewSchema.index({ target: 1, targetId: 1, hidden: 1, createdAt: -1 });

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDoc = HydratedDocument<Review>;
export const ReviewModel = model('Review', reviewSchema);
