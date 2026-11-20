import mongoose from 'mongoose';
import { env } from './environment.js';

let mongodInstance = null;
let primaryConnectionFailed = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If primary connection already failed in this process (e.g. IP not whitelisted on Atlas),
  // skip the 6-second timeout and immediately use fast in-memory MongoDB
  if (primaryConnectionFailed) {
    if (!mongodInstance) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
    }
    await mongoose.connect(mongodInstance.getUri());
    return mongoose.connection;
  }

  let uri = env.MONGODB_URI;

  if (!uri || uri.includes('<db_username>')) {
    if (uri && uri.includes('<db_username>')) {
      console.warn(
        '[Database] Notice: MONGODB_URI contains placeholder "<db_username>". Falling back to embedded in-memory MongoDB.'
      );
    } else {
      console.log('[Database] No MONGODB_URI provided. Initializing in-memory MongoDB instance...');
    }
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
      console.log(`[Database] In-memory MongoDB started at: ${uri}`);
    } catch (memErr) {
      console.error('[Database] Failed to start MongoMemoryServer:', memErr.message);
      uri = 'mongodb://127.0.0.1:27017/relay';
    }
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[Database] MongoDB connected successfully to: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    return mongoose.connection;
  } catch (error) {
    primaryConnectionFailed = true;
    console.warn(
      `[Database] Primary MongoDB connection failed (${error.message}). Falling back to embedded in-memory MongoDB...`
    );
    try {
      if (!mongodInstance) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
      }
      const fallbackUri = mongodInstance.getUri();
      await mongoose.connect(fallbackUri);
      console.log(`[Database] Fallback in-memory MongoDB connected successfully at: ${fallbackUri}`);
      return mongoose.connection;
    } catch (memErr) {
      console.error('[Database] Both primary and fallback MongoDB connections failed:', memErr.message);
      throw error;
    }
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
    mongodInstance = null;
  }
}
