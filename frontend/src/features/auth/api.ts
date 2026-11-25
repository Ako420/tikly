import { api, type AuthTokens } from '@/lib/api';
import type { SignUpRole } from './roles';

export type UserRole = SignUpRole | 'staff' | 'admin';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  language: 'en' | 'fr';
  status: 'active' | 'suspended' | 'disabled';
};

export type Session = { user: User; tokens: AuthTokens };

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: SignUpRole;
  language: 'en' | 'fr';
};

export type LoginInput = { identifier: string; password: string };

const noAuth = { skipAuth: true };

export const authApi = {
  register: (input: RegisterInput) => api.post<Session>('/auth/register', input, noAuth),
  login: (input: LoginInput) => api.post<Session>('/auth/login', input, noAuth),
  logout: () => api.post<null>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};
