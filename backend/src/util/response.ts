import type { Response } from 'express';

export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>) =>
  res.status(200).json({ success: true, data, ...(meta && { meta }) });

export const created = <T>(res: Response, data: T) => res.status(201).json({ success: true, data });
