import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { POST_TYPES } from '../types/enums';
import { URL_REGEX, bilingualText, hasText, ref, schemaOptions } from './shared';

const speakerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'validation.post.speaker.name.required'],
      trim: true,
      maxlength: [100, 'validation.post.speaker.name.maxLength'],
    },
    role: { type: String, trim: true, maxlength: [150, 'validation.post.speaker.role.maxLength'] },
    photoUrl: { type: String, match: [URL_REGEX, 'validation.post.speaker.photoUrl.invalid'] },
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    eventId: ref('Event', 'validation.common.eventId.required'),
    authorId: ref('User', 'validation.post.authorId.required'),
    type: {
      type: String,
      enum: { values: POST_TYPES, message: 'validation.post.type.invalid' },
      required: [true, 'validation.post.type.required'],
    },
    title: {
      type: bilingualText(150, 'validation.post.title.maxLength'),
      required: [true, 'validation.post.title.required'],
      validate: { validator: hasText, message: 'validation.post.title.required' },
    },
    body: {
      type: bilingualText(5000, 'validation.post.body.maxLength'),
      required: [true, 'validation.post.body.required'],
      validate: { validator: hasText, message: 'validation.post.body.required' },
    },
    images: { type: [{ type: String, match: [URL_REGEX, 'validation.post.images.invalid'] }], default: [] },
    speaker: { type: speakerSchema },
    pinned: { type: Boolean, default: false },
    notifiedAt: { type: Date },
  },
  schemaOptions,
);

postSchema.pre<PostDoc>('validate', function () {
  if (this.type === 'speaker' && !this.speaker?.name) {
    this.invalidate('speaker', 'validation.post.speaker.required');
  }
});

postSchema.index({ eventId: 1, pinned: -1, createdAt: -1 });

export type Post = InferSchemaType<typeof postSchema>;
export type PostDoc = HydratedDocument<Post>;
export const PostModel = model('Post', postSchema);
