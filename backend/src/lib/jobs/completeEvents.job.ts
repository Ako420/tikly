import type { Agenda } from 'agenda';
import { completeEndedEvents } from '../../service/event.service';
import { logger } from '../logger';

export const COMPLETE_EVENTS = 'complete-events';

export function defineCompleteEvents(agenda: Agenda) {
  agenda.define(
    COMPLETE_EVENTS,
    async () => {
      const completed = await completeEndedEvents(new Date());
      if (completed) logger.info({ completed }, 'Marked ended events as completed');
    },
    { concurrency: 1, lockLifetime: 5 * 60 * 1000 },
  );
}
