import type { RequestHandler } from 'express';
import type {
  ForgotPasswordBody,
  GoogleBody,
  LoginBody,
  LogoutBody,
  PushTokenBody,
  RefreshBody,
  RegisterBody,
  ResetPasswordBody,
  UpdateMeBody,
} from '../schema/auth.schema';
import * as authService from '../service/auth.service';
import { created, ok } from '../util/response';

export const register: RequestHandler = async (req, res) => {
  created(res, await authService.register(req.body as RegisterBody));
};

export const login: RequestHandler = async (req, res) => {
  ok(res, await authService.login(req.body as LoginBody));
};

export const google: RequestHandler = async (req, res) => {
  const { isNewUser, ...session } = await authService.signInWithGoogle(req.body as GoogleBody);
  if (isNewUser) created(res, { ...session, isNewUser });
  else ok(res, { ...session, isNewUser });
};

export const refresh: RequestHandler = async (req, res) => {
  ok(res, await authService.refresh((req.body as RefreshBody).refreshToken));
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.user!.id, (req.body as LogoutBody).pushToken);
  ok(res, null);
};

export const forgotPassword: RequestHandler = async (req, res) => {
  await authService.forgotPassword(req.body as ForgotPasswordBody);
  ok(res, null);
};

export const resetPassword: RequestHandler = async (req, res) => {
  await authService.resetPassword(req.body as ResetPasswordBody);
  ok(res, null);
};

export const me: RequestHandler = async (req, res) => {
  ok(res, await authService.getProfile(req.user!.id));
};

export const updateMe: RequestHandler = async (req, res) => {
  ok(res, await authService.updateProfile(req.user!.id, req.body as UpdateMeBody));
};

export const addPushToken: RequestHandler = async (req, res) => {
  await authService.addPushToken(req.user!.id, (req.body as PushTokenBody).token);
  ok(res, null);
};

export const removePushToken: RequestHandler = async (req, res) => {
  await authService.removePushToken(req.user!.id, (req.body as PushTokenBody).token);
  ok(res, null);
};
