import nodemailer from 'nodemailer';
import { setMailTransport } from '../src/lib/mailer';
import { setPushSender } from '../src/lib/push';

setMailTransport(nodemailer.createTransport({ jsonTransport: true }));
setPushSender({ send: async (messages) => ({ sent: messages.length, invalidTokens: [] }) });
