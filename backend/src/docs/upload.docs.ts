import { DocumentUpload, FileUpload, ImageUpload } from './components';
import { route } from './registry';

const tag = 'Uploads';
const fileErrors = {
  400: ['FILE_REQUIRED'],
  413: ['FILE_TOO_LARGE'],
  415: ['INVALID_FILE_TYPE'],
  502: ['UPLOAD_FAILED'],
};

route({
  method: 'post',
  path: '/uploads/image',
  tag,
  summary: 'Upload a public image',
  description:
    'JPEG, PNG or WebP, up to 5 MB, in a multipart field named `file`. Use the returned `url` as an event `coverUrl` or a service photo. Provider images go to `services/`, everyone else to `events/`.',
  roles: ['organizer', 'provider', 'exhibitor', 'admin'],
  multipart: FileUpload,
  status: 201,
  response: ImageUpload,
  errors: fileErrors,
});

route({
  method: 'post',
  path: '/uploads/document',
  tag,
  summary: 'Upload a private verification document',
  description:
    'PDF, JPEG or PNG, up to 10 MB, in a multipart field named `file`. Stored privately; only the `publicId` comes back (SEC-6).',
  roles: ['provider'],
  multipart: FileUpload,
  status: 201,
  response: DocumentUpload,
  errors: fileErrors,
});
