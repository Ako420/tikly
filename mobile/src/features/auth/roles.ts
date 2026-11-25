import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export const SIGN_UP_ROLES = ['attendee', 'organizer', 'provider', 'exhibitor'] as const;

export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

type RoleMeta = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  hasTag: boolean;
};

export const roleMeta: Record<SignUpRole, RoleMeta> = {
  attendee: { icon: 'ticket-confirmation', hasTag: false },
  organizer: { icon: 'calendar-month', hasTag: true },
  provider: { icon: 'storefront', hasTag: true },
  exhibitor: { icon: 'view-grid', hasTag: true },
};

export const isSignUpRole = (value: unknown): value is SignUpRole =>
  typeof value === 'string' && (SIGN_UP_ROLES as readonly string[]).includes(value);
