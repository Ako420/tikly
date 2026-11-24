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
};
