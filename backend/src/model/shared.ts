import mongoose, { Schema } from 'mongoose';

export const PHONE_REGEX = /^(\+?237)?6\d{8}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_REGEX = /^https?:\/\/\S+$/;

const HIDDEN_FIELDS = ['__v', 'passwordHash', 'googleId', 'refreshTokenHash', 'passwordResetTokenHash', 'passwordResetExpiresAt'];

export const schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      for (const field of HIDDEN_FIELDS) delete ret[field];
      return ret;
    },
  },
};

export const integer = (message: string) => ({
  validator: (value: number | null | undefined) => value == null || Number.isInteger(value),
  message,
});

export const ref = (model: string, message: string, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  ...(required && { required: [true, message] as [true, string] }),
});

export function bilingualText(maxLength: number, maxMessage: string) {
  return new Schema(
    {
      en: { type: String, trim: true, maxlength: [maxLength, maxMessage] },
      fr: { type: String, trim: true, maxlength: [maxLength, maxMessage] },
    },
    { _id: false },
  );
}

export const hasText = (value: { en?: string | null; fr?: string | null } | null | undefined) =>
  Boolean(value?.en?.trim() || value?.fr?.trim());

mongoose.set('runValidators', true);
mongoose.set('strictQuery', true);
