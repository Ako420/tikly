import type { Response } from 'express';
import { pageMeta, type Page } from './pagination';

export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>) =>
  res.status(200).json({ success: true, data, ...(meta && { meta }) });

export const created = <T>(res: Response, data: T) => res.status(201).json({ success: true, data });

export const paginated = <T>(res: Response, items: T[], page: Page, total: number) =>
  ok(res, items, pageMeta(page, total));
