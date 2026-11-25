import { sampleEvents } from '@/features/events/sampleEvents';
import type { AppNotification } from './types';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const event = (id: string) => sampleEvents.find((item) => item.id === id);

export function createSampleNotifications(now = Date.now()): AppNotification[] {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const comedy = event('evt-comedy-night');
  const wouri = event('evt-wouri-festival');

  return [
    {
      id: 'ntf-reminder',
      type: 'reminder_24h',
      createdAt: ago(5 * MINUTE),
      payload: { eventId: comedy?.id, eventTitle: comedy?.title, startAt: comedy?.startAt, venue: comedy?.venue },
    },
    {
      id: 'ntf-payment',
      type: 'ticket_purchased',
      createdAt: ago(HOUR),
      payload: { eventId: wouri?.id, eventTitle: wouri?.title, quantity: 2, tier: 'vip', amount: 20000, method: 'mtn' },
    },
    {
      id: 'ntf-update',
      type: 'event_update',
      createdAt: ago(2 * HOUR),
      payload: {
        eventId: wouri?.id,
        organizerName: 'Sawa Events Collective',
        message: {
          en: 'Lineup: Les Étoiles du Wouri confirmed for Saturday’s closing set.',
          fr: 'Programmation : Les Étoiles du Wouri confirmés pour la clôture de samedi.',
        },
      },
    },
    {
      id: 'ntf-cancelled',
      type: 'event_cancelled',
      createdAt: ago(DAY + 3 * HOUR),
      readAt: ago(DAY),
      payload: { eventTitle: { en: 'Afro Jazz Brunch', fr: 'Afro Jazz Brunch' }, amount: 6000 },
    },
    {
      id: 'ntf-welcome',
      type: 'account_welcome',
      createdAt: ago(3 * DAY),
      readAt: ago(3 * DAY),
      payload: { city: 'Douala' },
    },
  ];
}
