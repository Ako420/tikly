import { Router, type RequestHandler } from 'express';
import * as ctrl from '../controller/planning.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireEventOwner } from '../middleware/ownership';
import { validate } from '../middleware/validate';
import { eventIdParam } from '../schema/common.schema';
import * as s from '../schema/planning.schema';

export const planningRouter = Router({ mergeParams: true });

type Schemas = Parameters<typeof validate>[0];

const read = (schemas: Schemas = { params: eventIdParam }): RequestHandler[] => [
  authenticate,
  authorize('organizer', 'admin'),
  validate(schemas),
  requireEventOwner,
];

const write = (schemas: Schemas = { params: eventIdParam }): RequestHandler[] => [
  authenticate,
  authorize('organizer'),
  validate(schemas),
  requireEventOwner,
];

planningRouter.get('/budget', ...read(), ctrl.getBudget);
planningRouter.post('/budget', ...write({ params: eventIdParam, body: s.createBudgetItemBody }), ctrl.createBudgetItem);
planningRouter.patch(
  '/budget/:itemId',
  ...write({ params: s.budgetItemParam, body: s.updateBudgetItemBody }),
  ctrl.updateBudgetItem,
);
planningRouter.delete('/budget/:itemId', ...write({ params: s.budgetItemParam }), ctrl.deleteBudgetItem);

planningRouter.get('/checklist', ...read(), ctrl.getChecklist);
planningRouter.post(
  '/checklist',
  ...write({ params: eventIdParam, body: s.createChecklistItemBody }),
  ctrl.createChecklistItem,
);
planningRouter.patch(
  '/checklist/:itemId',
  ...write({ params: s.checklistItemParam, body: s.updateChecklistItemBody }),
  ctrl.updateChecklistItem,
);
planningRouter.delete('/checklist/:itemId', ...write({ params: s.checklistItemParam }), ctrl.deleteChecklistItem);

planningRouter.get('/guests', ...read({ params: eventIdParam, query: s.listGuestsQuery }), ctrl.listGuests);
planningRouter.post('/guests', ...write({ params: eventIdParam, body: s.createGuestBody }), ctrl.createGuest);
planningRouter.post('/guests/import-buyers', ...write(), ctrl.importBuyers);
planningRouter.patch('/guests/:guestId', ...write({ params: s.guestParam, body: s.updateGuestBody }), ctrl.updateGuest);
planningRouter.delete('/guests/:guestId', ...write({ params: s.guestParam }), ctrl.deleteGuest);

planningRouter.get('/agenda', validate({ params: eventIdParam }), optionalAuthenticate, ctrl.listAgenda);
planningRouter.post('/agenda', ...write({ params: eventIdParam, body: s.createAgendaItemBody }), ctrl.createAgendaItem);
planningRouter.patch(
  '/agenda/:itemId',
  ...write({ params: s.agendaItemParam, body: s.updateAgendaItemBody }),
  ctrl.updateAgendaItem,
);
planningRouter.delete('/agenda/:itemId', ...write({ params: s.agendaItemParam }), ctrl.deleteAgendaItem);
