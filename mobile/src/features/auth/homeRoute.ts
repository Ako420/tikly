import type { User, UserRole } from './api';

const HOME_BY_ROLE: Partial<Record<UserRole, string>> = {
  staff: '/gate',
  organizer: '/my-events',
  provider: '/requests',
  exhibitor: '/slot-events',
};

export const TABS_BY_ROLE: Partial<Record<UserRole, string[]>> = {
  attendee: ['home', 'explore', 'tickets', 'marketplace', 'profile'],
  organizer: ['my-events', 'marketplace', 'bookings', 'profile'],
  provider: ['requests', 'listings', 'explore', 'marketplace', 'earnings', 'profile'],
  exhibitor: ['slot-events', 'my-slots', 'marketplace', 'profile'],
};

export const ATTENDEE_TABS = ['home', 'explore', 'tickets', 'profile'];

export const tabsFor = (role: UserRole | undefined) => (role && TABS_BY_ROLE[role]) || ATTENDEE_TABS;

export const homeRouteFor = (user: Pick<User, 'role'> | null | undefined) => (user && HOME_BY_ROLE[user.role]) || '/home';
