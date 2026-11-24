import type { RequestHandler } from 'express';
import type {
  AcceptBookingBody,
  CreateBookingBody,
  DeclineBookingBody,
  ListBookingsQuery,
} from '../schema/booking.schema';
import * as bookingService from '../service/booking.service';
import { created, ok, paginated } from '../util/response';

export const create: RequestHandler = async (req, res) => {
  created(res, await bookingService.requestBooking(req.user!.id, req.body as CreateBookingBody));
};

export const list: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListBookingsQuery;
  const { items, total } = await bookingService.listBookings(req.user!, query);
  paginated(res, items, query, total);
};

export const getOne: RequestHandler = async (req, res) => {
  ok(res, await bookingService.toBookingView(req.booking!));
};

export const accept: RequestHandler = async (req, res) => {
  ok(res, await bookingService.acceptBooking(req.booking!, req.body as AcceptBookingBody));
};

export const decline: RequestHandler = async (req, res) => {
  ok(res, await bookingService.declineBooking(req.booking!, req.body as DeclineBookingBody));
};

export const cancel: RequestHandler = async (req, res) => {
  ok(res, await bookingService.cancelBooking(req.booking!));
};

export const complete: RequestHandler = async (req, res) => {
  ok(res, await bookingService.completeBooking(req.booking!));
};
