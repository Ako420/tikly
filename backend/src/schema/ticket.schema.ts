import { z } from 'zod';
import { pageQuery } from './common.schema';

export const myTicketsQuery = pageQuery.extend({
  when: z.enum(['upcoming', 'past'], 'validation.common.invalidValue').default('upcoming'),
});

export type MyTicketsQuery = z.infer<typeof myTicketsQuery>;
