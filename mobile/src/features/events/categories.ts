import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { EventCategory } from './types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const ALL_CATEGORIES_ICON: IconName = 'view-grid';

export const categoryIcons: Record<EventCategory, IconName> = {
  concerts: 'music-note',
  sports: 'trophy',
  conferences: 'presentation',
  comedy: 'emoticon-happy',
  festivals: 'white-balance-sunny',
  expos: 'storefront',
  other: 'dots-horizontal',
};

const toApiKey: Partial<Record<EventCategory, string>> = {
  concerts: 'concert',
  sports: 'sport',
  conferences: 'conference',
  comedy: 'comedy',
  festivals: 'festival',
  expos: 'exhibition',
};

const fromApiKey = new Map(Object.entries(toApiKey).map(([category, key]) => [key, category as EventCategory]));

export const toApiCategory = (category: EventCategory | undefined) => (category ? toApiKey[category] : undefined);

export const fromApiCategory = (key: string): EventCategory => fromApiKey.get(key) ?? 'other';
