import { sampleEvents } from './sampleEvents';
import type { EventDetails, EventSummary } from './types';

const image = (hash: string) => `https://cdn.wonder.so/images/01a20a1c-76f1-7172-82d3-2a99389b8276/${hash}.jpg`;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const summary = (id: string) => {
  const event = sampleEvents.find((item) => item.id === id);
  if (!event) throw new Error(`Unknown sample event ${id}`);
  return event;
};

const organizer = { name: 'Sawa Events Collective', verified: true, eventsCount: 14 };

const details: Record<string, Omit<EventDetails, keyof EventSummary>> = {
  'evt-wouri-festival': {
    endAt: '2026-12-07T02:00:00+01:00',
    tagline: { en: 'Music & food', fr: 'Musique et cuisine' },
    gallery: [
      image('5532a576479b4b350f7bee4f4917c89ff82a11a134d9bcb10358d7dd0cd1f038'),
      image('3d78b7da52b94751f068ff7f52aa06615c68d8bc479ee9270ea33c9c085b041f'),
      image('58c65adb83aea30c42f6a8179fce70c79b599e1b624aef9e1cab55d255b8fe0f'),
      image('62495b73bc07c0713d6d60fdf1fa8a7af2fe9d18fe8c4a76fccd828c7502a0dd'),
      image('0aa7add0bbb8ed80e06dd932730442c006dd9578002c22e8e04e3beb8b0b6028'),
      image('e740ddb664a8c9fe45c384b49792bceb3cc5cc5e6ea1f8d052e3d5448c676fa3'),
    ],
    rating: { average: 4.6, count: 212 },
    area: 'Bonabéri',
    address: {
      label: 'Bonabéri waterfront, Gate 2',
      line: 'Rue du Bac, Bonabéri · Douala',
      pin: 'Gate 2',
    },
    organizer,
    tiers: [
      {
        id: 'tier-wouri-standard',
        name: 'standard',
        perk: { en: 'General entry, both days', fr: 'Entrée générale, les deux jours' },
        price: 3000,
        remaining: 412,
        salesEndAt: '2026-12-05T12:00:00+01:00',
      },
      {
        id: 'tier-wouri-vip',
        name: 'vip',
        perk: { en: 'Riverside lounge + 2 drinks', fr: 'Salon au bord du fleuve + 2 boissons' },
        price: 10000,
        remaining: 18,
        salesEndAt: '2026-12-05T12:00:00+01:00',
      },
      {
        id: 'tier-wouri-vvip',
        name: 'vvip',
        perk: { en: 'Backstage, table service, parking', fr: 'Coulisses, service à table, parking' },
        price: 25000,
        remaining: 0,
        salesEndAt: '2026-12-05T12:00:00+01:00',
      },
    ],
    lineup: [
      {
        id: 'artist-etoiles',
        name: 'Les Étoiles du Wouri',
        role: { en: 'Headliner · Sat', fr: 'Tête d’affiche · Sam.' },
        photoUrl: image('b11a221b1478f5c20d5fa5a29ef272577897c95d31b241edf87bb3ea561c8292'),
        headliner: true,
      },
      {
        id: 'artist-aicha',
        name: 'Aïcha Ndedi',
        role: { en: 'Bikutsi · Sun', fr: 'Bikutsi · Dim.' },
        photoUrl: image('2fd340c3b93ab6908a34e45436b1913c1f5f59a1c4e6351348b7381f2da972b5'),
      },
      {
        id: 'artist-manu',
        name: 'Manu Kingue',
        role: { en: 'Makossa · Sat', fr: 'Makossa · Sam.' },
        photoUrl: image('a885b808cd63813d2e85e087338af8c9edbdac34345fca75f721a538ea369afa'),
      },
      {
        id: 'artist-tchop',
        name: 'DJ Tchop',
        role: { en: 'DJ · Both nights', fr: 'DJ · Les deux soirs' },
        photoUrl: image('7e58716c88f0dd7368f44fd3d25035b912a758e09281b11cfa5e13703d28a241'),
      },
      {
        id: 'artist-ngo-bell',
        name: 'MC Ngo Bell',
        role: { en: 'Host', fr: 'Animatrice' },
        photoUrl: image('60ecea0b50250957ea374440bd7a1b3f070acf9966ab679a8f78c95ad56e0991'),
      },
    ],
    lineupTotal: 9,
    about: {
      en: 'Two days of live bands, Sawa dance troupes and grilled fish on the banks of the Wouri. Bring the family in the afternoon, stay for the night stage. Food stalls from Bonabéri market run all weekend, with a kids’ corner until 19:00 and a quiet zone near the ferry dock.',
      fr: 'Deux jours de concerts, de troupes de danse Sawa et de poisson braisé au bord du Wouri. Venez en famille l’après-midi, restez pour la scène du soir. Les stands du marché de Bonabéri sont ouverts tout le week-end, avec un coin enfants jusqu’à 19 h et une zone calme près de l’embarcadère.',
    },
    updates: [
      {
        id: 'update-lineup',
        tag: 'lineup',
        postedAt: hoursAgo(2),
        body: {
          en: 'Les Étoiles du Wouri are confirmed for Saturday’s closing set at 21:00. VIP gates open 30 minutes early.',
          fr: 'Les Étoiles du Wouri sont confirmées pour le concert de clôture de samedi à 21 h. Les portes VIP ouvrent 30 minutes plus tôt.',
        },
        photoUrl: image('58c65adb83aea30c42f6a8179fce70c79b599e1b624aef9e1cab55d255b8fe0f'),
        likes: 128,
        comments: 14,
      },
      {
        id: 'update-location',
        tag: 'location',
        postedAt: hoursAgo(26),
        body: {
          en: 'Entrance is at Gate 2, next to the Bonabéri ferry dock. Free parking at Marché Bonabéri, 5 minutes on foot.',
          fr: 'L’entrée se fait par la porte 2, à côté de l’embarcadère de Bonabéri. Parking gratuit au marché de Bonabéri, à 5 minutes à pied.',
        },
        place: { name: 'Gate 2 · Ferry dock', address: 'Bonabéri, Douala' },
        likes: 46,
        comments: 9,
      },
      {
        id: 'update-info',
        tag: 'info',
        postedAt: hoursAgo(50),
        body: {
          en: 'Cash and Mobile Money accepted at every food stall. Bring your ticket QR on your phone or printed.',
          fr: 'Espèces et Mobile Money acceptés à tous les stands. Présentez le QR de votre billet sur téléphone ou imprimé.',
        },
        likes: 31,
        comments: 4,
      },
    ],
    updatesTotal: 8,
    agenda: [
      {
        id: 'agenda-gates',
        day: 1,
        startAt: '2026-12-05T16:00:00+01:00',
        title: { en: 'Gates open · Food village', fr: 'Ouverture des portes · Village gourmand' },
        location: { en: 'Riverside market', fr: 'Marché du bord du fleuve' },
      },
      {
        id: 'agenda-dance',
        day: 1,
        startAt: '2026-12-05T18:30:00+01:00',
        title: { en: 'Sawa dance showcase', fr: 'Spectacle de danse Sawa' },
        location: { en: 'Main stage · Bonabéri dance troupe', fr: 'Grande scène · Troupe de Bonabéri' },
      },
      {
        id: 'agenda-headline',
        day: 1,
        startAt: '2026-12-05T21:00:00+01:00',
        title: { en: 'Headline set: Les Étoiles du Wouri', fr: 'Tête d’affiche : Les Étoiles du Wouri' },
        location: { en: 'Main stage', fr: 'Grande scène' },
      },
    ],
  },
  'evt-comedy-night': {
    endAt: '2026-11-27T23:00:00+01:00',
    gallery: [image('811a80c79c750c7d57db90561ecc8f045776855a56c7a9b845306372f272a2ae')],
    area: 'Bonapriso',
    address: { label: 'Institut Français, Bonapriso', line: 'Rue Joss · Douala' },
    organizer: { name: 'Rire à Douala', verified: true, eventsCount: 6 },
    tiers: [
      {
        id: 'tier-comedy-standard',
        name: 'standard',
        perk: { en: 'Open seating', fr: 'Placement libre' },
        price: 5000,
        remaining: 64,
        salesEndAt: '2026-11-27T18:00:00+01:00',
      },
    ],
    lineup: [],
    lineupTotal: 0,
    about: {
      en: 'Five stand-up comedians from Douala and Yaoundé, in French and English. Doors open at 19:30.',
      fr: 'Cinq humoristes de Douala et Yaoundé, en français et en anglais. Ouverture des portes à 19 h 30.',
    },
    updates: [],
    updatesTotal: 0,
    agenda: [],
  },
  'evt-business-expo': {
    endAt: '2026-12-12T18:00:00+01:00',
    gallery: [image('2efd7c487be62aa7cdc821342637fd9b2d1cfdcbb17224de7ab958df24c09713')],
    area: 'Akwa',
    address: { label: 'Akwa Expo Hall', line: 'Boulevard de la Liberté, Akwa · Douala' },
    organizer: { name: 'Chambre de Commerce du Littoral', verified: true, eventsCount: 22 },
    tiers: [
      {
        id: 'tier-expo-standard',
        name: 'standard',
        perk: { en: 'Exhibition floor access', fr: 'Accès aux stands' },
        price: 2000,
        remaining: 380,
        salesEndAt: '2026-12-12T08:00:00+01:00',
      },
      {
        id: 'tier-expo-vip',
        name: 'vip',
        perk: { en: 'Conference talks + lunch', fr: 'Conférences + déjeuner' },
        price: 15000,
        remaining: 42,
        salesEndAt: '2026-12-11T18:00:00+01:00',
      },
    ],
    lineup: [],
    lineupTotal: 0,
    about: {
      en: 'Over 120 exhibitors from agrifood, logistics and fintech, with talks on doing business across CEMAC.',
      fr: 'Plus de 120 exposants de l’agroalimentaire, de la logistique et de la fintech, avec des conférences sur les affaires en zone CEMAC.',
    },
    updates: [],
    updatesTotal: 0,
    agenda: [],
  },
  'evt-littoral-cup': {
    endAt: '2026-12-13T17:00:00+01:00',
    gallery: [image('6abdcd4314d60d70af1154c130228f81076733ade0552a0349be1fa02b54c6dd')],
    area: 'Bépanda',
    address: { label: 'Stade de la Réunification', line: 'Bépanda · Douala' },
    organizer: { name: 'Ligue du Littoral', verified: false, eventsCount: 3 },
    tiers: [
      {
        id: 'tier-cup-standard',
        name: 'standard',
        perk: { en: 'Open stands', fr: 'Tribunes populaires' },
        price: 1500,
        remaining: 2300,
        salesEndAt: '2026-12-13T12:00:00+01:00',
      },
    ],
    lineup: [],
    lineupTotal: 0,
    about: {
      en: 'Union Douala and Les Astres meet in the regional cup final. Gates open two hours before kick-off.',
      fr: 'Union Douala et Les Astres s’affrontent en finale de la coupe régionale. Ouverture des portes deux heures avant le coup d’envoi.',
    },
    updates: [],
    updatesTotal: 0,
    agenda: [],
  },
};

export function getSampleEventDetails(id: string): EventDetails | undefined {
  const extra = details[id];
  if (!extra) return undefined;
  return { ...summary(id), ...extra };
}
