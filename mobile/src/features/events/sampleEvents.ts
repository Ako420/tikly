import type { EventSummary } from './types';

const image = (hash: string) => `https://cdn.wonder.so/images/01a20a1c-76f1-7172-82d3-2a99389b8276/${hash}.jpg`;

export const sampleEvents: EventSummary[] = [
  {
    id: 'evt-comedy-night',
    title: { en: 'Rire à Douala: Comedy Night', fr: 'Rire à Douala : soirée humour' },
    category: 'comedy',
    coverUrl: image('811a80c79c750c7d57db90561ecc8f045776855a56c7a9b845306372f272a2ae'),
    venue: 'Bonapriso',
    city: 'Douala',
    startAt: '2026-11-27T20:00:00+01:00',
    minPrice: 5000,
    hasMultipleTiers: false,
  },
  {
    id: 'evt-wouri-festival',
    title: { en: 'Wouri Riverside Festival', fr: 'Festival des rives du Wouri' },
    category: 'festivals',
    coverUrl: image('3d78b7da52b94751f068ff7f52aa06615c68d8bc479ee9270ea33c9c085b041f'),
    venue: 'Bonabéri waterfront',
    city: 'Douala',
    startAt: '2026-12-05T16:00:00+01:00',
    minPrice: 3000,
    hasMultipleTiers: true,
    sellingFast: true,
    featured: true,
  },
  {
    id: 'evt-business-expo',
    title: { en: 'Douala Business Expo', fr: 'Salon des affaires de Douala' },
    category: 'expos',
    coverUrl: image('2efd7c487be62aa7cdc821342637fd9b2d1cfdcbb17224de7ab958df24c09713'),
    venue: 'Akwa Expo Hall',
    city: 'Douala',
    startAt: '2026-12-12T09:00:00+01:00',
    minPrice: 2000,
    hasMultipleTiers: true,
    featured: true,
  },
  {
    id: 'evt-littoral-cup',
    title: { en: 'Littoral Cup Final', fr: 'Finale de la Coupe du Littoral' },
    category: 'sports',
    coverUrl: image('6abdcd4314d60d70af1154c130228f81076733ade0552a0349be1fa02b54c6dd'),
    venue: 'Stade Réunification',
    city: 'Douala',
    startAt: '2026-12-13T15:00:00+01:00',
    minPrice: 1500,
    hasMultipleTiers: false,
  },
];

export const sampleUser = { name: 'Amina Ngo Bassong', city: 'Douala', country: 'Cameroon' };
