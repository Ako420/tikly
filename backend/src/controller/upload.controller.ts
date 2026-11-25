import type { RequestHandler } from 'express';
import * as uploadService from '../service/upload.service';
import { created } from '../util/response';

export const image: RequestHandler = async (req, res) => {
  created(res, await uploadService.uploadImage(req.user!.role, req.file!));
};

export const document: RequestHandler = async (req, res) => {
  created(res, await uploadService.uploadDocument(req.file!));
};
