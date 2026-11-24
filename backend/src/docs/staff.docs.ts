import { z } from 'zod';
import { eventIdParam, idParam } from '../schema/common.schema';
import * as s from '../schema/staff.schema';
import { AssignedEvent, Assignment, Empty, StaffMember, User } from './components';
import { route } from './registry';

const tag = 'Staff';

route({
  method: 'post',
  path: '/organizer/staff',
  tag,
  summary: 'Create a gate staff account',
  description:
    'The staff member logs in on the mobile app with this phone and password (POST /auth/login) and sees only the events you assign (ACC-1, ACC-2).',
  roles: ['organizer'],
  body: s.createStaffBody.openapi('CreateStaffBody', {
    example: { name: 'Gate 1', phone: '690000001', password: 'gate-pass-2026' },
  }),
  status: 201,
  response: StaffMember,
  errors: { 409: ['PHONE_TAKEN'] },
});

route({
  method: 'get',
  path: '/organizer/staff',
  tag,
  summary: 'List my staff and their events',
  roles: ['organizer'],
  response: z.array(StaffMember),
});

route({
  method: 'patch',
  path: '/organizer/staff/{id}',
  tag,
  summary: 'Rename, reset the password, or enable or disable a staff account',
  description: 'A new password or `status: disabled` signs the staff member out.',
  roles: ['organizer (who created them)'],
  params: idParam,
  body: s.updateStaffBody.openapi('UpdateStaffBody', { example: { status: 'disabled' } }),
  response: User,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'delete',
  path: '/organizer/staff/{id}',
  tag,
  summary: 'Disable a staff account',
  description: 'Soft delete: the account is disabled and signed out, its scan history stays.',
  roles: ['organizer (who created them)'],
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events/{eventId}/staff',
  tag,
  summary: 'Assign a staff member to an event',
  roles: ['organizer (owner)'],
  params: eventIdParam,
  body: s.assignStaffBody.openapi('AssignStaffBody', { example: { staffId: '6743a1f2c9e77b0012ab34cf' } }),
  status: 201,
  response: Assignment,
  errors: { 404: ['NOT_FOUND'], 409: ['STAFF_ALREADY_ASSIGNED'] },
});

route({
  method: 'delete',
  path: '/events/{eventId}/staff/{staffId}',
  tag,
  summary: 'Remove a staff member from an event',
  roles: ['organizer (owner)'],
  params: s.eventStaffParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/staff/events',
  tag,
  summary: 'My assigned events (scanner mode)',
  description: 'Published events not ended more than a day ago. Events within a day of now come first (ACC-2).',
  roles: ['staff'],
  response: z.array(AssignedEvent),
});
