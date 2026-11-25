export const SIGN_UP_ROLES = ['attendee', 'organizer', 'provider', 'exhibitor'] as const;

export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

export const ROLE_COPY: Record<SignUpRole, { title: string; body: string; icon: string }> = {
  attendee: { title: 'Attendee', body: 'Discover events and buy tickets with Mobile Money.', icon: '🎟' },
  organizer: { title: 'Organizer', body: 'Create events, sell tickets and run your gate.', icon: '📅' },
  provider: { title: 'Service provider', body: 'List your services and get booked by organizers.', icon: '🛍' },
  exhibitor: { title: 'Exhibitor', body: 'Book stands and slots at upcoming events.', icon: '▦' },
};

export const isSignUpRole = (value: unknown): value is SignUpRole =>
  typeof value === 'string' && (SIGN_UP_ROLES as readonly string[]).includes(value);
