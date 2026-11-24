import * as s from '../schema/auth.schema';
import { Empty, GoogleSession, RefreshedTokens, Session, User } from './components';
import { route } from './registry';

const tag = 'Auth';
const limited = 'Rate limited with the other sign-in routes: 10 requests a minute per IP.';

route({
  method: 'post',
  path: '/auth/register',
  tag,
  summary: 'Sign up with email and password',
  description: `Creates an account with one fixed role (AUTH-1, AUTH-2) and sends a welcome email. Staff and admin cannot sign up. ${limited}`,
  access: 'public',
  body: s.registerBody.openapi('RegisterBody', {
    example: {
      name: 'Ama Ngono',
      email: 'ama@example.cm',
      phone: '677123456',
      password: 'correct-horse-9',
      role: 'attendee',
      language: 'fr',
    },
  }),
  status: 201,
  response: Session,
  errors: { 409: ['EMAIL_TAKEN', 'PHONE_TAKEN'], 429: ['RATE_LIMITED'] },
});

route({
  method: 'post',
  path: '/auth/login',
  tag,
  summary: 'Log in with email or phone',
  description: `\`identifier\` is an email, or a Cameroon mobile number in any format (677123456, +237 677 123 456…). Gate staff log in with their phone (AUTH-3). ${limited}`,
  access: 'public',
  body: s.loginBody.openapi('LoginBody', { example: { identifier: 'ama@example.cm', password: 'correct-horse-9' } }),
  response: Session,
  errors: { 401: ['INVALID_CREDENTIALS'], 403: ['ACCOUNT_SUSPENDED', 'ACCOUNT_DISABLED'], 429: ['RATE_LIMITED'] },
});

route({
  method: 'post',
  path: '/auth/google',
  tag,
  summary: 'Sign in or sign up with Google',
  description: [
    'Send the Google **ID token** from Google Identity Services (web) or `@react-native-google-signin/google-signin` (mobile).',
    'Existing users are signed in (200). An existing password account with the same verified email is linked to Google.',
    'For a new user, the first call without `role` and `phone` returns `400 GOOGLE_SIGNUP_INCOMPLETE` with `details: { missing, email, name }`; show a form and call again with the same `idToken` plus `role` and `phone` (201).',
    limited,
  ].join('\n\n'),
  access: 'public',
  body: s.googleBody.openapi('GoogleBody', {
    example: { idToken: 'eyJhbGciOiJSUzI1NiIs…', role: 'attendee', phone: '677123456', language: 'en' },
  }),
  response: GoogleSession,
  responseDescription: 'Signed in to an existing account',
  alsoStatus: { status: 201, description: 'New account created' },
  errors: {
    400: ['GOOGLE_SIGNUP_INCOMPLETE'],
    401: ['GOOGLE_TOKEN_INVALID', 'GOOGLE_EMAIL_UNVERIFIED'],
    403: ['GOOGLE_NOT_ALLOWED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_DISABLED'],
    409: ['GOOGLE_ACCOUNT_MISMATCH', 'PHONE_TAKEN', 'EMAIL_TAKEN'],
    429: ['RATE_LIMITED'],
    503: ['GOOGLE_NOT_CONFIGURED'],
  },
});

route({
  method: 'post',
  path: '/auth/refresh',
  tag,
  summary: 'Get new tokens',
  description:
    'Call when an access token expires (401 `TOKEN_EXPIRED`). The refresh token is single-use: store the new one. Only one session per account is active; logging in elsewhere invalidates the old refresh token.',
  access: 'public',
  body: s.refreshBody.openapi('RefreshBody'),
  response: RefreshedTokens,
  errors: { 401: ['UNAUTHORIZED', 'TOKEN_EXPIRED'], 403: ['ACCOUNT_SUSPENDED', 'ACCOUNT_DISABLED'] },
});

route({
  method: 'post',
  path: '/auth/logout',
  tag,
  summary: 'Log out',
  description: 'Revokes the refresh token. Send `pushToken` from a mobile device to stop notifications to it.',
  body: s.logoutBody.openapi('LogoutBody', { example: { pushToken: 'ExponentPushToken[abc123]' } }),
  response: Empty,
});

route({
  method: 'post',
  path: '/auth/forgot-password',
  tag,
  summary: 'Email a password reset link',
  description: `Always answers 200, whether or not the email exists. The link opens \`<web app>/reset-password?token=…\` and is valid for 1 hour (AUTH-4). ${limited}`,
  access: 'public',
  body: s.forgotPasswordBody.openapi('ForgotPasswordBody', { example: { email: 'ama@example.cm' } }),
  response: Empty,
  errors: { 429: ['RATE_LIMITED'] },
});

route({
  method: 'post',
  path: '/auth/reset-password',
  tag,
  summary: 'Set a new password with the emailed token',
  description: `The token works once. Resetting signs the account out everywhere. ${limited}`,
  access: 'public',
  body: s.resetPasswordBody.openapi('ResetPasswordBody', {
    example: { token: 'from-the-email-link', password: 'brand-new-pass' },
  }),
  response: Empty,
  errors: { 400: ['RESET_TOKEN_INVALID'], 429: ['RATE_LIMITED'] },
});

route({ method: 'get', path: '/auth/me', tag, summary: 'Get my profile', response: User });

route({
  method: 'patch',
  path: '/auth/me',
  tag,
  summary: 'Update my profile',
  description:
    'Email and role cannot change. Changing `language` changes the language of emails, push and error messages (AUTH-6).',
  body: s.updateMeBody.openapi('UpdateMeBody', { example: { name: 'Ama N.', language: 'fr' } }),
  response: User,
  errors: { 409: ['PHONE_TAKEN'] },
});

route({
  method: 'post',
  path: '/auth/me/push-tokens',
  tag,
  summary: 'Register this device for push notifications',
  description: 'Send the Expo push token. Adding the same token twice keeps one copy.',
  body: s.pushTokenBody.openapi('PushTokenBody', { example: { token: 'ExponentPushToken[abc123]' } }),
  response: Empty,
});

route({
  method: 'delete',
  path: '/auth/me/push-tokens',
  tag,
  summary: 'Stop push notifications to this device',
  body: s.pushTokenBody,
  response: Empty,
});
