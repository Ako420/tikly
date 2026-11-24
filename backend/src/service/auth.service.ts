import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { ACCESS_TOKEN_TTL_SECONDS, BCRYPT_ROUNDS, PASSWORD_RESET_MINUTES } from '../config/constants';
import { verifyGoogleIdToken } from '../lib/google';
import { sendMail, type MailTemplate, type TemplateData } from '../lib/mailer';
import { UserModel, type UserDoc } from '../model/user.model';
import type {
  ForgotPasswordBody,
  GoogleBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  UpdateMeBody,
} from '../schema/auth.schema';
import { SELF_SIGNUP_ROLES, type Language, type Role, type UserStatus } from '../types/enums';
import { assertActive } from '../util/accountStatus';
import { AppError } from '../util/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../util/jwt';
import { randomToken, sha256 } from '../util/token';

let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomToken(), BCRYPT_ROUNDS));

function sendInBackground<K extends MailTemplate>(to: string, template: K, lang: Language, data: TemplateData[K]) {
  void sendMail({ to, template, lang, data }).catch(() => undefined);
}

function buildTokens(user: UserDoc, refreshToken: string) {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role as Role, lang: user.language as Language }),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

async function startSession(user: UserDoc) {
  const refreshToken = signRefreshToken(user.id);
  await UserModel.updateOne({ _id: user._id }, { refreshTokenHash: sha256(refreshToken) });
  return { user, tokens: buildTokens(user, refreshToken) };
}

export async function register(input: RegisterBody) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    language: input.language,
    passwordHash,
  });
  sendInBackground(input.email, 'account_welcome', input.language, { name: user.name, role: input.role });
  return startSession(user);
}

export async function login({ identifier, password }: LoginBody) {
  const filter = identifier.includes('@') ? { email: identifier } : { phone: identifier };
  const user = await UserModel.findOne(filter).select('+passwordHash');
  const matches = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !matches) throw AppError.unauthorized('INVALID_CREDENTIALS');
  assertActive(user.status as UserStatus);
  return startSession(user);
}

const canUseGoogle = (role: string) => (SELF_SIGNUP_ROLES as readonly string[]).includes(role);

export async function signInWithGoogle(input: GoogleBody) {
  const profile = await verifyGoogleIdToken(input.idToken);

  const linked = await UserModel.findOne({ googleId: profile.googleId });
  if (linked) {
    assertActive(linked.status as UserStatus);
    return { ...(await startSession(linked)), isNewUser: false };
  }

  const byEmail = await UserModel.findOne({ email: profile.email });
  if (byEmail) {
    if (!canUseGoogle(byEmail.role)) throw AppError.forbidden('GOOGLE_NOT_ALLOWED');
    if (byEmail.googleId) throw AppError.conflict('GOOGLE_ACCOUNT_MISMATCH');
    assertActive(byEmail.status as UserStatus);
    const result = await UserModel.updateOne(
      { _id: byEmail._id, googleId: { $exists: false } },
      { googleId: profile.googleId },
    );
    if (result.modifiedCount === 0) throw AppError.conflict('GOOGLE_ACCOUNT_MISMATCH');
    byEmail.googleId = profile.googleId;
    return { ...(await startSession(byEmail)), isNewUser: false };
  }

  const missing = [!input.role && 'role', !input.phone && 'phone'].filter(Boolean);
  if (!input.role || !input.phone) {
    throw AppError.badRequest('GOOGLE_SIGNUP_INCOMPLETE', { missing, email: profile.email, name: profile.name });
  }
  const language = input.language ?? 'en';
  const user = await UserModel.create({
    name: profile.name,
    email: profile.email,
    phone: input.phone,
    role: input.role,
    language,
    googleId: profile.googleId,
  });
  sendInBackground(profile.email, 'account_welcome', language, { name: user.name, role: input.role });
  return { ...(await startSession(user)), isNewUser: true };
}

export async function refresh(refreshToken: string) {
  const { sub } = verifyRefreshToken(refreshToken);
  const nextRefreshToken = signRefreshToken(sub);
  const user = await UserModel.findOneAndUpdate(
    { _id: sub, refreshTokenHash: sha256(refreshToken), status: 'active' },
    { refreshTokenHash: sha256(nextRefreshToken) },
    { new: true },
  );
  if (!user) {
    const existing = await UserModel.findById(sub).select('status').lean();
    assertActive(existing?.status as UserStatus | undefined);
    throw AppError.unauthorized();
  }
  return { tokens: buildTokens(user, nextRefreshToken) };
}

export async function logout(userId: string, pushToken?: string) {
  await UserModel.updateOne(
    { _id: userId },
    { $unset: { refreshTokenHash: 1 }, ...(pushToken && { $pull: { pushTokens: pushToken } }) },
  );
}

export async function forgotPassword({ email }: ForgotPasswordBody) {
  const user = await UserModel.findOne({ email, status: 'active' });
  if (!user) return;
  const token = randomToken();
  await UserModel.updateOne(
    { _id: user._id },
    {
      passwordResetTokenHash: sha256(token),
      passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000),
    },
  );
  const resetUrl = `${env.APP_WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
  sendInBackground(email, 'password_reset', user.language as Language, { name: user.name, resetUrl });
}

export async function resetPassword({ token, password }: ResetPasswordBody) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await UserModel.findOneAndUpdate(
    { passwordResetTokenHash: sha256(token), passwordResetExpiresAt: { $gt: new Date() } },
    { passwordHash, $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1, refreshTokenHash: 1 } },
    { new: true },
  );
  if (!user) throw AppError.badRequest('RESET_TOKEN_INVALID');
}

export async function getProfile(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw AppError.notFound();
  return user;
}

export async function updateProfile(userId: string, input: UpdateMeBody) {
  const user = await UserModel.findByIdAndUpdate(userId, input, { new: true });
  if (!user) throw AppError.notFound();
  return user;
}

export async function addPushToken(userId: string, token: string) {
  await UserModel.updateOne({ _id: userId }, { $addToSet: { pushTokens: token } });
}

export async function removePushToken(userId: string, token: string) {
  await UserModel.updateOne({ _id: userId }, { $pull: { pushTokens: token } });
}
