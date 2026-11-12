import mongoose from 'mongoose';
import { env } from './environment.js';

let mongodInstance = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = env.MONGODB_URI;

  if (!uri) {
    console.log('[Database] No MONGODB_URI provided. Initializing in-memory MongoDB instance...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      uri = mongodInstance.getUri();
      console.log(`[Database] In-memory MongoDB started at: ${uri}`);
    } catch (memErr) {
      console.error('[Database] Failed to start MongoMemoryServer:', memErr.message);
      // Fallback to local default uri if memory server fails
      uri = 'mongodb://127.0.0.1:27017/relay';
    }
  }

  try {
    await mongoose.connect(uri);
    console.log(`[Database] MongoDB connected successfully to: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    return mongoose.connection;
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error.message);
    throw error;
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
