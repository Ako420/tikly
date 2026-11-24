import { Health } from './components';
import { route } from './registry';

route({
  method: 'get',
  path: '/health',
  tag: 'Health',
  summary: 'Check that the API and database are up',
  access: 'public',
  response: Health,
  errors: { 503: ['SERVICE_UNAVAILABLE'] },
});
