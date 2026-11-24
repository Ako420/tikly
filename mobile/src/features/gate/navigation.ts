import { router, type Href } from 'expo-router';

export const leaveTo = (fallback: Href) => (router.canGoBack() ? router.back() : router.replace(fallback));

export const scannerHref = (eventId: string): Href => ({ pathname: '/gate/[eventId]', params: { eventId } });
