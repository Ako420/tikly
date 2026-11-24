import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://127.0.0.1:1/tests-must-use-the-memory-server',
    },
  },
});
