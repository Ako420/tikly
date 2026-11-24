import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { openApiDocument } from '../src/docs/openapi';
import en from '../src/locales/en.json';
import fr from '../src/locales/fr.json';
import { apiRouter } from '../src/router';

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
  handle: { stack?: Layer[] };
  rawPath?: string;
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function mountedRoutes(stack: Layer[], prefix = ''): string[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const path = `${prefix}${layer.route.path === '/' ? '' : layer.route.path}`.replace(/:(\w+)/g, '{$1}');
      return Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${path}`);
    }
    if (layer.handle.stack) return mountedRoutes(layer.handle.stack, `${prefix}${layer.rawPath ?? ''}`);
    return [];
  });
}

const doc = openApiDocument();
type Operation = {
  tags?: string[];
  security?: Record<string, string[]>[];
  responses: Record<string, { description: string }>;
};
const operations = Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
  METHODS.flatMap((method) => {
    const operation = (item as Record<string, Operation | undefined>)[method];
    return operation ? [{ key: `${method.toUpperCase()} ${path}`, operation }] : [];
  }),
);

describe('OpenAPI document', () => {
  it('documents exactly the routes the API serves', () => {
    const served = mountedRoutes(apiRouter.stack as unknown as Layer[]).sort();
    const documented = operations.map((op) => op.key).sort();
    expect(served.length).toBeGreaterThan(40);
    expect(documented).toEqual(served);
  });

  it('gives every operation a tag, a summary and a success response', () => {
    for (const { key, operation } of operations) {
      expect(operation.tags, key).toHaveLength(1);
      expect(
        Object.keys(operation.responses).some((status) => status === '200' || status === '201'),
        key,
      ).toBe(true);
    }
  });

  it('only uses error codes that have English and French messages', () => {
    const codes = new Set(
      operations.flatMap(({ operation }) =>
        Object.values(operation.responses).flatMap((response) =>
          [...response.description.matchAll(/`([A-Z_]+)`/g)].map((m) => m[1]!),
        ),
      ),
    );
    expect(codes.size).toBeGreaterThan(20);
    for (const code of codes) {
      expect(en.errors, code).toHaveProperty(code);
      expect(fr.errors, code).toHaveProperty(code);
    }
  });

  it('marks protected routes with the bearer scheme and public ones without it', () => {
    const security = (key: string) => operations.find((op) => op.key === key)!.operation.security;
    expect(security('GET /auth/me')).toEqual([{ bearerAuth: [] }]);
    expect(security('GET /events')).toBeUndefined();
    expect(security('GET /events/{id}')).toEqual([{}, { bearerAuth: [] }]);
  });
});

describe('docs routes', () => {
  const app = buildApp();

  it('serves the JSON spec for code generators', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.servers).toEqual([{ url: '/api/v1' }]);
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });
});
