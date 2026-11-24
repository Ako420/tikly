import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/live/**/*.live.ts'],
    testTimeout: 60_000,
    env: { NODE_ENV: 'test' },
  },
});
