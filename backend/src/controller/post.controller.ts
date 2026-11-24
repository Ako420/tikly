import type { RequestHandler } from 'express';
import type { CreatePostBody, ListPostsQuery, UpdatePostBody } from '../schema/post.schema';
import * as postService from '../service/post.service';
import { created, ok, paginated } from '../util/response';

export const list: RequestHandler = async (req, res) => {
  const query = req.validatedQuery as ListPostsQuery;
  const { items, total } = await postService.listPosts(String(req.params.eventId), req.user, query);
  paginated(res, items, query, total);
};

export const create: RequestHandler = async (req, res) => {
  created(res, await postService.createPost(req.event!, req.user!.id, req.body as CreatePostBody));
};

export const update: RequestHandler = async (req, res) => {
  ok(res, await postService.updatePost(req.post!, req.body as UpdatePostBody));
};

export const remove: RequestHandler = async (req, res) => {
  await postService.deletePost(req.post!);
  ok(res, null);
};
