import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { connectDb, disconnectDb } from '../../src/config/db';

export function testDatabaseUri(name: string) {
  const url = new URL(inject('mongoUri'));
  url.pathname = `/${name}`;
  return url.toString();
}

export function useTestDatabase(name: string) {
  beforeAll(async () => {
    await connectDb(testDatabaseUri(name));
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDb();
  });
}
