import type { RequestHandler } from 'express';
import type { MyTicketsQuery } from '../schema/ticket.schema';
import * as ticketService from '../service/ticket.service';
import { ok, paginated } from '../util/response';

export const listMine: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as MyTicketsQuery;
  const { items, total } = await ticketService.listMyTickets(req.user!.id, query);
  paginated(res, items, query, total);
};

export const getOne: RequestHandler = async (req, res) => {
  ok(res, await ticketService.getTicket(String(req.params.id), req.user!));
};

export const pdf: RequestHandler = async (req, res) => {
  const { filename, pdf: file } = await ticketService.ticketPdf(String(req.params.id), req.user!);
  res
    .status(200)
    .type('application/pdf')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .setHeader('Cache-Control', 'private, no-store')
    .send(file);
};

export const cancel: RequestHandler = async (req, res) => {
  ok(res, await ticketService.cancelTicket(String(req.params.id), req.user!));
};
