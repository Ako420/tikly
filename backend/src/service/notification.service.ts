import type { Types } from 'mongoose';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { sendMail } from '../lib/mailer';
import { getPushSender, type PushMessage } from '../lib/push';
import { EventModel, NotificationModel, TicketModel, UserModel } from '../model';
import type { Language, NotificationChannel, NotificationType } from '../types/enums';
import { AppError } from '../util/AppError';
import { formatDateTime, formatXaf } from '../util/format';
import { t } from '../util/i18n';
import { pageMeta, skipFor, type Page } from '../util/pagination';

type Payload = Record<string, unknown>;
type EventInfo = {
  _id: Types.ObjectId;
  title?: { en?: string | null; fr?: string | null } | null;
  startAt: Date;
  venue: string;
  city: string;
};
type NotificationLike = {
  _id: Types.ObjectId;
  type: string;
  payload?: Payload | null;
  eventId?: Types.ObjectId | null;
};

const REMINDER_WINDOW_MS = (24 * 60 + 15) * 60 * 1000;
const EMAILED_ELSEWHERE: NotificationType[] = ['ticket_purchased'];
const inFlight = new Set<Promise<unknown>>();

type Bilingual = { en?: string | null; fr?: string | null };

const pickText = (text: Bilingual | null | undefined, lang: Language) =>
  (lang === 'fr' ? text?.fr || text?.en : text?.en || text?.fr) ?? '';

const titleIn = (event: EventInfo | undefined, lang: Language) =>
  (lang === 'fr' ? event?.title?.fr || event?.title?.en : event?.title?.en || event?.title?.fr) ?? '';

const ticketCount = (count: number, lang: Language) =>
  t(count === 1 ? 'email.common.ticketsOne' : 'email.common.ticketsMany', lang, { count });

export function renderNotification(notification: NotificationLike, lang: Language, event?: EventInfo) {
  const payload = notification.payload ?? {};
  const type = notification.type;
  const vars: Record<string, unknown> = {
    ...payload,
    event: titleIn(event, lang) || String(payload.title ?? ''),
    when: event ? formatDateTime(event.startAt, lang) : '',
    where: event ? `${event.venue}, ${event.city}` : '',
    amount: typeof payload.amount === 'number' ? formatXaf(payload.amount) : '',
    tickets: ticketCount(Number(payload.tickets ?? 1), lang),
    date: payload.startDate ? formatDateTime(String(payload.startDate), lang) : '',
    slots: Array.isArray(payload.slots) ? payload.slots.join(', ') : '',
    reason: payload.reason ? t('notifications.common.reason', lang, { reason: payload.reason }) : '',
    postTitle: pickText(payload.post as Bilingual | undefined, lang),
  };
  if (typeof payload.refunded === 'number') vars.amount = formatXaf(payload.refunded);
  const bodyKey = type === 'booking_cancelled' && typeof payload.refunded === 'number' ? 'refunded' : 'body';
  return {
    title: t(`notifications.${type}.title`, lang, vars),
    body: t(`notifications.${type}.${bodyKey}`, lang, vars).trim(),
  };
}

function linkFor(notification: NotificationLike) {
  const payload = notification.payload ?? {};
  if (payload.bookingId) return `${env.APP_WEB_URL}/bookings/${String(payload.bookingId)}`;
  if (notification.type === 'ticket_purchased' || notification.type === 'reminder_24h') {
    return `${env.APP_WEB_URL}/tickets`;
  }
  if (notification.eventId) return `${env.APP_WEB_URL}/events/${String(notification.eventId)}`;
  return env.APP_WEB_URL;
}

const pushData = (notification: NotificationLike) => {
  const payload = notification.payload ?? {};
  return {
    notificationId: String(notification._id),
    type: notification.type,
    ...(notification.eventId && { eventId: String(notification.eventId) }),
    ...(['bookingId', 'orderId', 'providerId', 'ticketId', 'postId'] as const).reduce<Record<string, string>>(
      (ids, key) => {
        if (payload[key]) ids[key] = String(payload[key]);
        return ids;
      },
      {},
    ),
  };
};

async function eventsById(ids: (Types.ObjectId | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const events = unique.length
    ? await EventModel.find({ _id: { $in: unique } })
        .select('title startAt venue city')
        .lean()
    : [];
  return new Map(events.map((event) => [String(event._id), event as EventInfo]));
}

async function claim(ids: Types.ObjectId[]) {
  const claimed: Types.ObjectId[] = [];
  for (const id of ids) {
    const won = await NotificationModel.updateOne({ _id: id, sentAt: { $exists: false } }, { sentAt: new Date() });
    if (won.modifiedCount === 1) claimed.push(id);
  }
  return claimed;
}

async function emailFor(
  notification: NotificationLike,
  user: { name: string; email: string },
  lang: Language,
  text: { title: string; body: string },
  event?: EventInfo,
) {
  if (notification.type === 'reminder_24h' && event) {
    await sendMail({
      to: user.email,
      template: 'reminder_24h',
      lang,
      data: {
        name: user.name,
        eventTitle: titleIn(event, lang),
        startAt: event.startAt,
        venue: event.venue,
        city: event.city,
        ticketCount: Number(notification.payload?.tickets ?? 1),
      },
    });
    return;
  }
  await sendMail({
    to: user.email,
    template: 'notification',
    lang,
    data: { name: user.name, title: text.title, body: text.body, url: linkFor(notification) },
  });
}

export async function deliverNotifications(ids: Types.ObjectId[]) {
  const claimed = await claim(ids);
  if (claimed.length === 0) return;
  const notifications = await NotificationModel.find({ _id: { $in: claimed } }).lean();
  const [users, events] = await Promise.all([
    UserModel.find({ _id: { $in: notifications.map((item) => item.userId) }, status: 'active' })
      .select('name email language pushTokens')
      .lean(),
    eventsById(notifications.map((item) => item.eventId)),
  ]);
  const userOf = new Map(users.map((user) => [String(user._id), user]));

  const pushes: PushMessage[] = [];
  const channels = new Map<string, NotificationChannel[]>();
  for (const notification of notifications) {
    const user = userOf.get(String(notification.userId));
    const used: NotificationChannel[] = [];
    channels.set(String(notification._id), used);
    if (!user) continue;
    const lang = (user.language ?? 'en') as Language;
    const event = notification.eventId ? events.get(String(notification.eventId)) : undefined;
    const text = renderNotification(notification, lang, event);

    if (user.pushTokens?.length) {
      pushes.push({ to: user.pushTokens, ...text, data: pushData(notification) });
      used.push('push');
    }
    if (user.email && !EMAILED_ELSEWHERE.includes(notification.type as NotificationType)) {
      try {
        await emailFor(notification, { name: user.name, email: user.email }, lang, text, event);
        used.push('email');
      } catch (err) {
        logger.warn({ err, notificationId: String(notification._id) }, 'Notification email failed');
      }
    }
  }

  if (pushes.length) {
    try {
      const { invalidTokens } = await getPushSender().send(pushes);
      if (invalidTokens.length) {
        await UserModel.updateMany(
          { pushTokens: { $in: invalidTokens } },
          { $pull: { pushTokens: { $in: invalidTokens } } },
        );
      }
    } catch (err) {
      logger.error({ err }, 'Push notifications failed');
      for (const used of channels.values()) {
        const index = used.indexOf('push');
        if (index >= 0) used.splice(index, 1);
      }
    }
  }

  await NotificationModel.bulkWrite(
    [...channels].map(([id, used]) => ({ updateOne: { filter: { _id: id }, update: { channels: used } } })),
  );
}

export async function notifyUsers(userIds: string[], type: NotificationType, payload: Payload, eventId?: string) {
  if (userIds.length === 0) return;
  const created = await NotificationModel.insertMany(
    userIds.map((userId) => ({ userId, type, payload, eventId, channels: [] })),
  );
  const delivery = deliverNotifications(created.map((item) => item._id))
    .catch((err) => logger.error({ err, type }, 'Notification delivery failed'))
    .finally(() => inFlight.delete(delivery));
  inFlight.add(delivery);
}

export async function settleNotifications() {
  while (inFlight.size) await Promise.all([...inFlight]);
}

export async function notifyAdmins(type: NotificationType, payload: Payload, eventId?: string) {
  const admins = await UserModel.find({ role: 'admin', status: 'active' }).distinct('_id');
  await notifyUsers(admins.map(String), type, payload, eventId);
}

export async function listMyNotifications(user: { id: string; language: Language }, page: Page) {
  const filter = { userId: user.id };
  const [items, total, unread] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(page.limit).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ ...filter, readAt: { $exists: false } }),
  ]);
  const events = await eventsById(items.map((item) => item.eventId));
  const views = items.map((item) => {
    const event = item.eventId ? events.get(String(item.eventId)) : undefined;
    return {
      id: String(item._id),
      type: item.type,
      ...renderNotification(item, user.language, event),
      data: pushData(item),
      read: Boolean(item.readAt),
      readAt: item.readAt ?? null,
      createdAt: (item as { createdAt?: Date }).createdAt,
    };
  });
  return { items: views, meta: { ...pageMeta(page, total), unread } };
}

export async function markRead(userId: string, notificationId: string) {
  const notification = await NotificationModel.findOne({ _id: notificationId, userId });
  if (!notification) throw AppError.notFound();
  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }
  return { id: notification.id, read: true, readAt: notification.readAt };
}

export async function markAllRead(userId: string) {
  const { modifiedCount } = await NotificationModel.updateMany(
    { userId, readAt: { $exists: false } },
    { readAt: new Date() },
  );
  return { updated: modifiedCount };
}

export async function sendEventReminders(now = new Date()) {
  const events = await EventModel.find({
    status: 'published',
    startAt: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
  })
    .select('_id')
    .lean();
  let sent = 0;
  for (const event of events) {
    const holders = await TicketModel.aggregate<{ _id: Types.ObjectId; tickets: number }>([
      { $match: { eventId: event._id, status: { $in: ['valid', 'checked_in'] } } },
      { $group: { _id: '$holderId', tickets: { $sum: 1 } } },
    ]);
    const reminded = new Set(
      (await NotificationModel.find({ eventId: event._id, type: 'reminder_24h' }).distinct('userId')).map(String),
    );
    const fresh = holders.filter((holder) => !reminded.has(String(holder._id)));
    if (fresh.length) {
      await NotificationModel.insertMany(
        fresh.map((holder) => ({
          userId: holder._id,
          eventId: event._id,
          type: 'reminder_24h',
          payload: { tickets: holder.tickets },
          channels: [],
        })),
        { ordered: false },
      ).catch((err: { code?: number; writeErrors?: unknown[] }) => {
        if (err.code !== 11000 && !err.writeErrors) throw err;
      });
    }
    const due = await NotificationModel.find({
      eventId: event._id,
      type: 'reminder_24h',
      sentAt: { $exists: false },
    }).distinct('_id');
    await deliverNotifications(due);
    sent += due.length;
  }
  return sent;
}
