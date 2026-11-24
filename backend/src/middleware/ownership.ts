import type { RequestHandler } from 'express';
import { BookingModel } from '../model/booking.model';
import { EventModel } from '../model/event.model';
import { ProviderModel } from '../model/provider.model';
import { ServiceModel } from '../model/service.model';
import { SlotModel } from '../model/slot.model';
import { StaffAssignmentModel } from '../model/staffAssignment.model';
import { TicketTierModel } from '../model/ticketTier.model';
import { UserModel } from '../model/user.model';
import { partyOf } from '../service/booking.service';
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

export const requireStaffOwner: RequestHandler = async (req, _res, next) => {
  const staff = await UserModel.findOne({ _id: req.params.staffId ?? req.params.id, role: 'staff' });
  if (!staff || String(staff.organizerId) !== req.user!.id) throw AppError.notFound();
  req.staff = staff;
  next();
};

export const requireEventAccess: RequestHandler = async (req, _res, next) => {
  const source = (req.validatedQuery ?? req.body ?? {}) as { eventId?: string };
  const event = await EventModel.findById(source.eventId);
  if (!event) throw AppError.notFound();
  const user = req.user!;
  if (user.role === 'organizer') {
    if (String(event.organizerId) !== user.id) throw AppError.forbidden('NOT_ASSIGNED_TO_EVENT');
  } else {
    const assigned =
      String(event.organizerId) === user.organizerId &&
      (await StaffAssignmentModel.exists({ staffId: user.id, eventId: event._id }));
    if (!assigned) throw AppError.forbidden('NOT_ASSIGNED_TO_EVENT');
  }
  req.event = event;
  next();
};

export const requireServiceOwner: RequestHandler = async (req, _res, next) => {
  const service = await ServiceModel.findOne({ _id: req.params.id, active: true });
  if (!service) throw AppError.notFound();
  const owns = await ProviderModel.exists({ _id: service.providerId, userId: req.user!.id });
  if (!owns) throw AppError.forbidden();
  req.service = service;
  next();
};

export const requireBookingParty: RequestHandler = async (req, _res, next) => {
  const booking = await BookingModel.findById(req.params.id);
  if (!booking) throw AppError.notFound();
  const party = await partyOf(booking, req.user!);
  if (!party) throw AppError.notFound();
  req.booking = booking;
  req.bookingParty = party;
  next();
};

export const requireSlotOwner: RequestHandler = async (req, _res, next) => {
  const slot = await SlotModel.findById(req.params.id);
  if (!slot) throw AppError.notFound();
  const event = await EventModel.findById(slot.eventId);
  if (!event) throw AppError.notFound();
  if (req.user!.role !== 'admin' && String(event.organizerId) !== req.user!.id) throw AppError.forbidden();
  req.slot = slot;
  req.event = event;
  next();
};
