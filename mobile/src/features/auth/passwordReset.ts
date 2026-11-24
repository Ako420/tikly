import { MIN_PASSWORD_LENGTH } from '@/lib/validation';

export const PASSWORD_RESET_LINK_HOURS = 1;
export const RESEND_COOLDOWN_SECONDS = 60;

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const LONG_PASSWORD_LENGTH = 12;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;
  if (password.length < MIN_PASSWORD_LENGTH) return 1;
  const checks = [
    password.length >= LONG_PASSWORD_LENGTH,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
  ];
  return (1 + checks.filter(Boolean).length) as PasswordStrength;
}
