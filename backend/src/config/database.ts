import mongoose from 'mongoose';
import { env } from './env';

/**
 * Serverless-safe MongoDB connection.
 *
 * On Vercel each function invocation may reuse a "warm" container. Opening a new
 * connection per invocation exhausts the Atlas connection pool, so we cache the
 * connection promise on the global object and reuse it across invocations.
 *
 * Locally (long-lived process) this simply connects once on boot.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalWithMongoose = global as unknown as { _mongoose?: MongooseCache };

const cache: MongooseCache = globalWithMongoose._mongoose || { conn: null, promise: null };
globalWithMongoose._mongoose = cache;

export const connectDB = async (): Promise<typeof mongoose> => {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    // bufferCommands:false makes queries fail fast instead of queueing while a
    // cold connection is still opening — surfaces problems rather than hanging.
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
        bufferCommands: false,
      })
      .then((m) => {
        console.log(`✅ MongoDB connected: ${m.connection.host}`);
        return m;
      })
      .catch((error) => {
        // Reset so the next invocation can retry instead of caching a rejection.
        cache.promise = null;
        console.error('❌ MongoDB connection error:', error);
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
};
