import type { User } from './api';

export const homeRouteFor = (user: Pick<User, 'role'> | null | undefined) =>
  user?.role === 'organizer' ? '/organizer' : '/';
