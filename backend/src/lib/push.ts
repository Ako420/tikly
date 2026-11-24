import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { env } from '../config/env';
import { logger } from './logger';

export type PushMessage = { to: string[]; title: string; body: string; data?: Record<string, unknown> };
export type PushResult = { sent: number; invalidTokens: string[] };

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushResult>;
}

export const isPushToken = (token: string) => Expo.isExpoPushToken(token);

export function createExpoSender(accessToken = env.EXPO_ACCESS_TOKEN): PushSender {
  const expo = new Expo(accessToken ? { accessToken } : {});
  return {
    async send(messages) {
      const expanded: ExpoPushMessage[] = messages.flatMap((message) =>
        message.to.filter(isPushToken).map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: 'default' as const,
          priority: 'high' as const,
        })),
      );
      const invalidTokens: string[] = [];
      let sent = 0;
      for (const chunk of expo.chunkPushNotifications(expanded)) {
        let tickets: ExpoPushTicket[];
        try {
          tickets = await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          logger.error({ err, count: chunk.length }, 'Push delivery failed');
          continue;
        }
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'ok') {
            sent += 1;
            return;
          }
          const to = chunk[index]?.to;
          if (ticket.details?.error === 'DeviceNotRegistered' && typeof to === 'string') invalidTokens.push(to);
          else logger.warn({ error: ticket.details?.error, message: ticket.message }, 'Push rejected');
        });
      }
      return { sent, invalidTokens };
    },
  };
}

let sender: PushSender | undefined;

export function getPushSender() {
  sender ??= createExpoSender();
  return sender;
}

export function setPushSender(next: PushSender | undefined) {
  sender = next;
}
