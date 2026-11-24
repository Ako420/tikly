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
      JWT_ACCESS_SECRET: 'tests-access-secret-that-is-at-least-32-chars',
      JWT_REFRESH_SECRET: 'tests-refresh-secret-that-is-at-least-32-chars',
      CLOUDINARY_CLOUD_NAME: 'tests-must-mock-cloudinary',
      CLOUDINARY_API_KEY: '000000000000000',
      CLOUDINARY_API_SECRET: 'tests-must-mock-cloudinary-secret',
      APP_WEB_URL: 'https://tikly.test',
      SMTP_HOST: 'smtp.tests-must-mock-mail.invalid',
      SMTP_PORT: '587',
      SMTP_USER: 'tests@tikly.test',
      SMTP_PASS: 'tests-must-mock-mail',
      MAIL_FROM: 'Tikly <tests@tikly.test>',
    },
  },
});
