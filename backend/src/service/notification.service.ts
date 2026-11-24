import { NotificationModel } from '../model/notification.model';
import { UserModel } from '../model/user.model';
import type { NotificationType } from '../types/enums';

type Payload = Record<string, unknown>;

export async function notifyUsers(userIds: string[], type: NotificationType, payload: Payload, eventId?: string) {
  if (userIds.length === 0) return;
  await NotificationModel.insertMany(userIds.map((userId) => ({ userId, type, payload, eventId, channels: [] })));
}

export async function notifyAdmins(type: NotificationType, payload: Payload, eventId?: string) {
  const admins = await UserModel.find({ role: 'admin', status: 'active' }).distinct('_id');
  await notifyUsers(admins.map(String), type, payload, eventId);
}
