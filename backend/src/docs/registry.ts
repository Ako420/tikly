import { OpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z, type ZodObject, type ZodType } from 'zod';
import '../schema/openapi';

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Access token from /auth/login, /auth/register, /auth/google or /auth/refresh. Valid for 15 minutes.',
});

export const ErrorEnvelope = registry.register(
  'ErrorEnvelope',
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Some fields are invalid. Please check and try again.' }),
      details: z.unknown().nullable().openapi({
        example: null,
        description:
          'For VALIDATION_ERROR: one entry per invalid field, `{ "<field>": { "code", "message" } }`. Other codes may add context, or null.',
      }),
    }),
  }),
);

export const PageMeta = registry.register(
  'PageMeta',
  z.object({
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 20 }),
    total: z.number().int().openapi({ example: 134 }),
    pages: z.number().int().openapi({ example: 7 }),
  }),
);

export const envelope = (data: ZodType) => z.object({ success: z.literal(true), data });
export const pagedEnvelope = (item: ZodType) =>
  z.object({ success: z.literal(true), data: z.array(item), meta: PageMeta });

type Status = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 502 | 503;
type Access = 'public' | 'optional' | 'auth';

type Operation = {
  method: RouteConfig['method'];
  path: string;
  tag: string;
  summary: string;
  description?: string;
  access?: Access;
  roles?: string[];
  params?: ZodObject;
  query?: ZodObject;
  headers?: ZodObject;
  body?: ZodType;
  multipart?: ZodType;
  status?: 200 | 201;
  alsoStatus?: { status: 200 | 201; description: string };
  response: ZodType;
  paged?: boolean;
  responseDescription?: string;
  errors?: Partial<Record<Status, string[]>>;
};

const STATUS_TEXT: Record<Status, string> = {
  400: 'Bad request',
  401: 'Not logged in or token expired',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict with the current state',
  413: 'Too large',
  415: 'Unsupported file type',
  429: 'Too many requests',
  502: 'Upstream service failed',
  503: 'Service unavailable',
};

function errorResponses(op: Operation) {
  const errors: Partial<Record<Status, string[]>> = { ...op.errors };
  const add = (status: Status, ...codes: string[]) => {
    errors[status] = [...new Set([...(errors[status] ?? []), ...codes])];
  };
  if (op.params || op.query || op.headers || op.body || op.multipart) add(400, 'VALIDATION_ERROR');
  if (op.access === 'auth' || op.access === 'optional') add(401, 'UNAUTHORIZED', 'TOKEN_EXPIRED');
  if (op.access === 'auth') add(403, 'ACCOUNT_SUSPENDED', 'ACCOUNT_DISABLED');
  if (op.roles) add(403, 'FORBIDDEN');

  return Object.fromEntries(
    (Object.entries(errors) as [string, string[]][]).map(([status, codes]) => [
      status,
      {
        description: `${STATUS_TEXT[Number(status) as Status]}. Codes: ${codes.map((code) => `\`${code}\``).join(', ')}`,
        content: { 'application/json': { schema: ErrorEnvelope } },
      },
    ]),
  );
}

export function route(op: Operation) {
  const access = op.access ?? 'auth';
  const notes = [
    op.description,
    access === 'public' ? '**Access:** public.' : undefined,
    access === 'optional' ? '**Access:** public; send a token to see your own unpublished data.' : undefined,
    access === 'auth' ? `**Access:** ${op.roles?.length ? op.roles.join(', ') : 'any logged-in user'}.` : undefined,
  ].filter(Boolean);

  const request: RouteConfig['request'] = {};
  if (op.params) request.params = op.params;
  if (op.query) request.query = op.query;
  if (op.headers) request.headers = op.headers;
  if (op.body) request.body = { required: true, content: { 'application/json': { schema: op.body } } };
  if (op.multipart) request.body = { required: true, content: { 'multipart/form-data': { schema: op.multipart } } };

  registry.registerPath({
    method: op.method,
    path: op.path,
    tags: [op.tag],
    summary: op.summary,
    description: notes.join('\n\n'),
    ...(access !== 'public' && { security: access === 'optional' ? [{}, { bearerAuth: [] }] : [{ bearerAuth: [] }] }),
    request,
    responses: {
      [op.status ?? 200]: {
        description: op.responseDescription ?? 'Success',
        content: { 'application/json': { schema: op.paged ? pagedEnvelope(op.response) : envelope(op.response) } },
      },
      ...(op.alsoStatus && {
        [op.alsoStatus.status]: {
          description: op.alsoStatus.description,
          content: { 'application/json': { schema: envelope(op.response) } },
        },
      }),
      ...errorResponses({ ...op, access }),
    },
  });
}
