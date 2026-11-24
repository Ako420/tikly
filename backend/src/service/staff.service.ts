import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { BCRYPT_ROUNDS } from '../config/constants';
import { EventModel, StaffAssignmentModel, TicketModel, UserModel, type EventDoc, type UserDoc } from '../model';
import type { CreateStaffBody, UpdateStaffBody } from '../schema/staff.schema';
import { AppError } from '../util/AppError';

const DAY = 24 * 60 * 60 * 1000;

type EventSummary = {
  _id: Types.ObjectId;
  title?: { en?: string | null; fr?: string | null } | null;
  startAt: Date;
  endAt: Date;
  venue: string;
  city: string;
  status: string;
};

const toEventSummary = (event: EventSummary) => ({
  id: String(event._id),
  title: event.title,
  startAt: event.startAt,
  endAt: event.endAt,
  venue: event.venue,
  city: event.city,
  status: event.status,
});

export async function createStaff(organizerId: string, input: CreateStaffBody) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const staff = await UserModel.create({
    name: input.name,
    phone: input.phone,
    passwordHash,
    role: 'staff',
    organizerId,
  });
  return { ...staff.toJSON(), events: [] };
}

export async function listStaff(organizerId: string) {
  const staff = await UserModel.find({ role: 'staff', organizerId }).sort({ name: 1, _id: 1 });
  const assignments = await StaffAssignmentModel.find({ staffId: { $in: staff.map((member) => member._id) } }).lean();
  const events = await EventModel.find({ _id: { $in: assignments.map((assignment) => assignment.eventId) } })
    .select('title startAt endAt venue city status')
    .lean<EventSummary[]>();
  const eventById = new Map(events.map((event) => [String(event._id), toEventSummary(event)]));
  return staff.map((member) => ({
    ...member.toJSON(),
    events: assignments
      .filter((assignment) => String(assignment.staffId) === member.id)
      .flatMap((assignment) => eventById.get(String(assignment.eventId)) ?? [])
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
  }));
}

export async function updateStaff(staff: UserDoc, input: UpdateStaffBody) {
  const changes: Record<string, unknown> = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.status !== undefined) changes.status = input.status;
  if (input.password !== undefined) changes.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const signOut = input.password !== undefined || input.status === 'disabled';
  const updated = await UserModel.findByIdAndUpdate(
    staff._id,
    { $set: changes, ...(signOut && { $unset: { refreshTokenHash: 1 } }) },
    { new: true },
  );
  return updated!;
}

export async function disableStaff(staff: UserDoc) {
  await UserModel.updateOne({ _id: staff._id }, { status: 'disabled', $unset: { refreshTokenHash: 1 } });
}

export async function assignStaff(event: EventDoc, staffId: string) {
  const staff = await UserModel.findOne({ _id: staffId, role: 'staff', organizerId: event.organizerId });
  if (!staff) throw AppError.notFound();
  await StaffAssignmentModel.create({ staffId: staff._id, eventId: event._id });
  return { staffId: staff.id, eventId: event.id };
}

export async function unassignStaff(event: EventDoc, staffId: string) {
  const { deletedCount } = await StaffAssignmentModel.deleteOne({ staffId, eventId: event._id });
  if (deletedCount === 0) throw AppError.notFound();
}

type GateCounts = { capacity: number; checkedIn: number; scannedByMe: number };

async function gateCounts(eventIds: Types.ObjectId[], staffId: string) {
  const staff = new Types.ObjectId(staffId);
  const rows = await TicketModel.aggregate<GateCounts & { _id: Types.ObjectId }>([
    { $match: { eventId: { $in: eventIds }, status: { $in: ['valid', 'checked_in'] } } },
    {
      $group: {
        _id: '$eventId',
        capacity: { $sum: 1 },
        checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
        scannedByMe: {
          $sum: {
            $cond: [
              {
                $in: [
                  { staffId: staff, type: 'entry' },
                  { $map: { input: '$checkIns', as: 'c', in: { staffId: '$$c.staffId', type: '$$c.type' } } },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  return new Map(rows.map(({ _id, ...counts }) => [String(_id), counts]));
}

export async function listAssignedEvents(staffId: string, now = new Date()) {
  const eventIds = await StaffAssignmentModel.find({ staffId }).distinct('eventId');
  const events = await EventModel.find({
    _id: { $in: eventIds },
    status: 'published',
    endAt: { $gte: new Date(now.getTime() - DAY) },
  })
    .select('title startAt endAt venue city status')
    .sort({ startAt: 1 })
    .lean<EventSummary[]>();
  const counts = await gateCounts(
    events.map((event) => event._id),
    staffId,
  );
  const isToday = (event: EventSummary) =>
    event.startAt.getTime() - DAY <= now.getTime() && now.getTime() <= event.endAt.getTime() + DAY;
  return [...events.filter(isToday), ...events.filter((event) => !isToday(event))].map((event) => ({
    ...toEventSummary(event),
    ...(counts.get(String(event._id)) ?? { capacity: 0, checkedIn: 0, scannedByMe: 0 }),
    today: isToday(event),
  }));
}
