import { z } from 'zod';
import { PASSWORD_MAX_BYTES } from '../config/constants';
import { LANGUAGES, SELF_SIGNUP_ROLES } from '../types/enums';
import { camPhone, normalizePhone } from './common.schema';

export const personName = z
  .string('validation.user.name.required')
  .trim()
  .min(2, 'validation.user.name.minLength')
  .max(100, 'validation.user.name.maxLength');

const email = z
  .string('validation.user.email.required')
  .trim()
  .toLowerCase()
  .max(254, 'validation.user.email.maxLength')
  .pipe(z.email('validation.user.email.invalid'));

export const newPassword = z
  .string('validation.auth.password.required')
  .min(8, 'validation.auth.password.minLength')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES, 'validation.auth.password.tooLong');

const language = z.enum(LANGUAGES, 'validation.user.language.invalid');

const expoPushToken = z
  .string('validation.auth.pushToken.invalid')
  .trim()
  .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'validation.auth.pushToken.invalid');

const requiredString = (key: string) => z.string(key).min(1, key);

export const registerBody = z.object({
  name: personName,
  email,
  phone: camPhone,
  password: newPassword,
  role: z.enum(SELF_SIGNUP_ROLES, 'validation.user.role.invalid'),
  language: language.default('en'),
});

export const loginBody = z.object({
  identifier: requiredString('validation.auth.identifier.required')
    .trim()
    .transform((value) => (value.includes('@') ? value.toLowerCase() : normalizePhone(value))),
  password: requiredString('validation.auth.password.required'),
});

export const refreshBody = z.object({ refreshToken: requiredString('validation.auth.refreshToken.required') });

export const logoutBody = z.object({ pushToken: expoPushToken.optional() });

export const forgotPasswordBody = z.object({ email });

export const resetPasswordBody = z.object({
  token: requiredString('validation.auth.resetToken.required'),
  password: newPassword,
});

export const updateMeBody = z
  .object({ name: personName.optional(), phone: camPhone.optional(), language: language.optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export const pushTokenBody = z.object({ token: expoPushToken });

export const googleBody = z.object({
  idToken: requiredString('validation.auth.idToken.required'),
  role: z.enum(SELF_SIGNUP_ROLES, 'validation.user.role.invalid').optional(),
  phone: camPhone.optional(),
  language: language.optional(),
});

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
export type RefreshBody = z.infer<typeof refreshBody>;
export type LogoutBody = z.infer<typeof logoutBody>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;
export type UpdateMeBody = z.infer<typeof updateMeBody>;
export type PushTokenBody = z.infer<typeof pushTokenBody>;
export type GoogleBody = z.infer<typeof googleBody>;
