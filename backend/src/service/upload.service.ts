import { UPLOAD_FOLDERS } from '../config/constants';
import { signedDocumentUrl, uploadPrivateDocument, uploadPublicImage } from '../lib/cloudinary';
import type { Role } from '../types/enums';

export function imageFolderFor(role: Role) {
  return role === 'provider' ? UPLOAD_FOLDERS.services : UPLOAD_FOLDERS.events;
}

export function uploadImage(role: Role, file: Express.Multer.File) {
  return uploadPublicImage(file.buffer, imageFolderFor(role));
}

export function uploadDocument(file: Express.Multer.File) {
  return uploadPrivateDocument(file.buffer, UPLOAD_FOLDERS.documents);
}

export function documentViewUrl(publicId: string) {
  return signedDocumentUrl(publicId);
}
