import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/live/**'],
    globalSetup: ['test/globalSetup.ts'],
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://127.0.0.1:1/tests-must-use-the-memory-server',
      CLOUDINARY_CLOUD_NAME: 'tests-must-mock-cloudinary',
      CLOUDINARY_API_KEY: '000000000000000',
      CLOUDINARY_API_SECRET: 'tests-must-mock-cloudinary-secret',
    },
  },
});
