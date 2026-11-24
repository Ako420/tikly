import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GOOGLE_APP_CLIENT_ID: z.string().trim().default(''),
  GOOGLE_WEB_CLIENT_ID: z.string().trim().default(''),
  QR_SECRET: z.string().min(32),
  PAYMENT_PROVIDER: z.enum(['fapshi']).default('fapshi'),
  PAYMENT_BASE_URL: z.string().url().default('https://sandbox.fapshi.com'),
  FAPSHI_API_USER: z.string().min(1),
  FAPSHI_API_KEY: z.string().min(1),
  FAPSHI_WEBHOOK_SECRET: z.string().optional(),
  FAPSHI_PAYOUT_API_USER: z.string().optional(),
  FAPSHI_PAYOUT_API_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  APP_WEB_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  EXPO_ACCESS_TOKEN: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export const env = envSchema.parse(process.env);
