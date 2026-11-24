import * as Clipboard from 'expo-clipboard';
import { Linking, Share } from 'react-native';
import { env } from '@/config/env';

export const eventUrl = (eventId: string) => `${env.webUrl}/events/${eventId}`;

export async function shareToWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  const app = `whatsapp://send?text=${text}`;
  if (await Linking.canOpenURL(app)) return Linking.openURL(app);
  return Linking.openURL(`https://wa.me/?text=${text}`);
}

export const shareToFacebook = (url: string) =>
  Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);

export const shareNative = (message: string) => Share.share({ message });

export const copyToClipboard = (value: string) => Clipboard.setStringAsync(value);

export const openInMaps = (query: string) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
