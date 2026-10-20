
import mongoose from "mongoose";
import dns from "node:dns";

export async function connectdb(url) {
  if (!url) {
    throw new Error("MONGODB_URL is missing from .env");
  }

  // Apply the DNS workaround before connecting
  dns.setServers(["8.8.8.8"]);

  console.log("Connecting to MongoDB...");

  try {
    await mongoose.connect(url, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("MongoDB connected successfully!");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}
