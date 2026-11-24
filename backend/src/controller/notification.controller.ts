import type { RequestHandler } from 'express';
import * as notificationService from '../service/notification.service';
import type { Page } from '../util/pagination';
import { ok } from '../util/response';

export const listMine: RequestHandler = async (req, res) => {
  const { items, meta } = await notificationService.listMyNotifications(req.user!, req.validatedQuery as Page);
  ok(res, items, meta);
};

export const read: RequestHandler = async (req, res) => {
  ok(res, await notificationService.markRead(req.user!.id, String(req.params.id)));
};

export const readAll: RequestHandler = async (req, res) => {
  ok(res, await notificationService.markAllRead(req.user!.id));
};
