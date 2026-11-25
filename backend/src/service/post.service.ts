import type { FilterQuery } from 'mongoose';
import { EventModel, PostModel, TicketModel, type EventDoc, type Post, type PostDoc } from '../model';
import type { CreatePostBody, ListPostsQuery, UpdatePostBody } from '../schema/post.schema';
import type { EventStatus, Role } from '../types/enums';
import { AppError } from '../util/AppError';
import { skipFor } from '../util/pagination';
import { notifyUsers } from './notification.service';

type Viewer = { id: string; role: Role } | undefined;

const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];
const NOTIFY_LIMIT = 3;
const NOTIFY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function listPosts(eventId: string, viewer: Viewer, query: ListPostsQuery) {
  const event = await EventModel.findById(eventId).select('organizerId status').lean();
  if (!event) throw AppError.notFound();
  const isOwner = viewer?.role === 'admin' || (viewer !== undefined && String(event.organizerId) === viewer.id);
  if (!isOwner && !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();

  const filter: FilterQuery<Post> = { eventId: event._id, ...(query.type && { type: query.type }) };
  const [items, total] = await Promise.all([
    PostModel.find(filter).sort({ pinned: -1, createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit),
    PostModel.countDocuments(filter),
  ]);
  return { items, total };
}

async function assertCanNotify(event: EventDoc) {
  if (event.status !== 'published') throw AppError.conflict('POST_NOTIFY_NOT_PUBLISHED');
  const recent = await PostModel.countDocuments({
    eventId: event._id,
    notifiedAt: { $gte: new Date(Date.now() - NOTIFY_WINDOW_MS) },
  });
  if (recent >= NOTIFY_LIMIT) throw AppError.tooManyRequests('POST_NOTIFY_LIMIT');
}

async function notifyHolders(event: EventDoc, post: PostDoc) {
  const holders = await TicketModel.distinct('holderId', {
    eventId: event._id,
    status: { $in: ['valid', 'checked_in'] },
  });
  post.notifiedAt = new Date();
  await post.save();
  await notifyUsers(
    holders.map(String),
    'event_post',
    { postId: post.id, post: { en: post.title?.en ?? undefined, fr: post.title?.fr ?? undefined } },
    event.id,
  );
  return holders.length;
}

export async function createPost(event: EventDoc, authorId: string, input: CreatePostBody) {
  if (event.status === 'suspended') throw AppError.conflict('EVENT_NOT_EDITABLE');
  const { notify, ...fields } = input;
  if (notify) await assertCanNotify(event);
  const post = await PostModel.create({ ...fields, eventId: event._id, authorId });
  const notified = notify ? await notifyHolders(event, post) : 0;
  return { ...post.toJSON(), notified };
}

export async function updatePost(post: PostDoc, input: UpdatePostBody) {
  const { speaker, ...fields } = input;
  for (const [field, value] of Object.entries(fields)) {
    if (value !== undefined) post.set(field, value);
  }
  if (speaker === null) post.set('speaker', undefined);
  else if (speaker) post.set('speaker', speaker);
  await post.save();
  return post;
}

export async function deletePost(post: PostDoc) {
  await PostModel.deleteOne({ _id: post._id });
}
