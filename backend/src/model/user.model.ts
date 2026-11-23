import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { LANGUAGES, ROLES, USER_STATUSES } from '../types/enums';
import { EMAIL_REGEX, PHONE_REGEX, schemaOptions } from './shared';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'validation.user.name.required'],
      trim: true,
      minlength: [2, 'validation.user.name.minLength'],
      maxlength: [100, 'validation.user.name.maxLength'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'validation.user.email.maxLength'],
      match: [EMAIL_REGEX, 'validation.user.email.invalid'],
    },
    phone: {
      type: String,
      required: [true, 'validation.user.phone.required'],
      trim: true,
      match: [PHONE_REGEX, 'validation.user.phone.invalid'],
    },
    passwordHash: { type: String, required: [true, 'validation.user.passwordHash.required'], select: false },
    role: {
      type: String,
      enum: { values: ROLES, message: 'validation.user.role.invalid' },
      required: [true, 'validation.user.role.required'],
      immutable: true,
    },
    language: {
      type: String,
      enum: { values: LANGUAGES, message: 'validation.user.language.invalid' },
      default: 'en',
    },
    status: {
      type: String,
      enum: { values: USER_STATUSES, message: 'validation.user.status.invalid' },
      default: 'active',
    },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User' },
    pushTokens: { type: [String], default: [] },
    refreshTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  schemaOptions,
);

userSchema.pre<UserDoc>('validate', function () {
  if (this.role !== 'staff' && !this.email) this.invalidate('email', 'validation.user.email.required');
  if (this.role === 'staff' && !this.organizerId) this.invalidate('organizerId', 'validation.user.organizerId.required');
  if (this.role !== 'staff' && this.organizerId) this.invalidate('organizerId', 'validation.user.organizerId.notAllowed');
});

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ organizerId: 1 }, { sparse: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<User>;
export const UserModel = model('User', userSchema);
