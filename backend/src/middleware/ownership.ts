import type { RequestHandler } from 'express';
import { EventModel } from '../model/event.model';
import { TicketTierModel } from '../model/ticketTier.model';
import { AppError } from '../util/AppError';

export const requireEventOwner: RequestHandler = async (req, _res, next) => {
  const event = await EventModel.findById(req.params.eventId ?? req.params.id);
  if (!event) throw AppError.notFound();
  if (req.user!.role !== 'admin' && String(event.organizerId) !== req.user!.id) throw AppError.forbidden();
  req.event = event;
  next();
};

export const requireTierOwner: RequestHandler = async (req, _res, next) => {
  const tier = await TicketTierModel.findById(req.params.id);
  if (!tier) throw AppError.notFound();
  const event = await EventModel.findById(tier.eventId);
  if (!event) throw AppError.notFound();
  if (req.user!.role !== 'admin' && String(event.organizerId) !== req.user!.id) throw AppError.forbidden();
  req.tier = tier;
  req.event = event;
  next();
};
