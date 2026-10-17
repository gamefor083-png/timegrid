import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Prevent Mongoose from queuing queries for 10s when disconnected
  mongoose.set('bufferCommands', false);

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timegrid';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    return null;
  }
}
