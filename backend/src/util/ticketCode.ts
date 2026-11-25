import { randomInt } from 'node:crypto';
import { TICKET_CODE_ALPHABET } from '../config/constants';

const pick = (length: number) =>
  Array.from({ length }, () => TICKET_CODE_ALPHABET[randomInt(TICKET_CODE_ALPHABET.length)]).join('');

export const ticketCode = () => `EVT-${pick(4)}-${pick(3)}`;
