import { api, type AuthTokens } from '@/lib/api';
import type { Language } from '@/i18n/I18nProvider';
import type { SignUpRole } from './roles';

export type UserRole = SignUpRole | 'staff' | 'admin';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  language: Language;
  status: 'active' | 'suspended' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

export type Session = { user: User; tokens: AuthTokens };

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: SignUpRole;
  language: Language;
};

export type GoogleSignInInput = { idToken: string; role?: SignUpRole; phone?: string; language?: string };

export type LoginInput = { identifier: string; password: string };

export type UpdateProfileInput = Partial<Pick<User, 'name' | 'phone' | 'language'>>;

const noAuth = { skipAuth: true };

export const authApi = {
  register: (input: RegisterInput) => api.post<Session>('/auth/register', input, noAuth),
  google: (input: GoogleSignInInput) => api.post<Session>('/auth/google', input, noAuth),
  login: (input: LoginInput) => api.post<Session>('/auth/login', input, noAuth),
  logout: () => api.post<null>('/auth/logout', {}),
  me: () => api.get<User>('/auth/me'),
  updateMe: (input: UpdateProfileInput) => api.patch<User>('/auth/me', input),
  forgotPassword: (email: string) => api.post<null>('/auth/forgot-password', { email }, noAuth),
  resetPassword: (token: string, password: string) => api.post<null>('/auth/reset-password', { token, password }, noAuth),
};
