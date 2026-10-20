import mongoose from "mongoose";

let connectionPromise = null;

export async function connectdb(url) {
  if (!url) {
    throw new Error("MONGODB_URL is missing");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(url, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
  }

  try {
    await connectionPromise;
    console.log("MongoDB connected successfully!");
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}