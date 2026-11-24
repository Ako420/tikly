import type { Agenda } from 'agenda';
import { sendEventReminders } from '../../service/notification.service';
import { logger } from '../logger';

export const SEND_REMINDERS = 'send-reminders';

export function defineSendReminders(agenda: Agenda) {
  agenda.define(
    SEND_REMINDERS,
    async () => {
      const sent = await sendEventReminders(new Date());
      if (sent) logger.info({ sent }, 'Sent event reminders');
    },
    { concurrency: 1, lockLifetime: 10 * 60 * 1000 },
  );
}
