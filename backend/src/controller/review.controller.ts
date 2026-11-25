import type { RequestHandler } from 'express';
import type { EventReviewBody, OrganizerReviewsQuery, ProviderReviewBody } from '../schema/review.schema';
import * as reviewService from '../service/review.service';
import type { Page } from '../util/pagination';
import { created, ok, paginated } from '../util/response';

export const listForEvent: RequestHandler = async (req, res) => {
  const page = req.validatedQuery as Page;
  const { items, total } = await reviewService.listEventReviews(String(req.params.eventId), page);
  paginated(res, items, page, total);
};

export const reviewEvent: RequestHandler = async (req, res) => {
  created(res, await reviewService.reviewEvent(req.user!, String(req.params.eventId), req.body as EventReviewBody));
};

export const listForProvider: RequestHandler = async (req, res) => {
  const page = req.validatedQuery as Page;
  const { items, total } = await reviewService.listProviderReviews(String(req.params.providerId), page);
  paginated(res, items, page, total);
};

export const reviewProvider: RequestHandler = async (req, res) => {
  created(
    res,
    await reviewService.reviewProvider(req.user!, String(req.params.providerId), req.body as ProviderReviewBody),
  );
};

export const listForOrganizer: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as OrganizerReviewsQuery;
  const { items, total } = await reviewService.listOrganizerReviews(req.user!.id, query);
  paginated(res, items, query, total);
};

export const organizerSummary: RequestHandler = async (req, res) => {
  ok(res, await reviewService.organizerReviewSummary(req.user!.id));
};
