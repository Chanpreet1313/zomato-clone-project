
import dns from "node:dns";
import dotenv from "dotenv";
import { connectdb } from "./config/connection.js";

// Configure DNS before importing the application
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

// Import Express app after DNS configuration
const { default: app } = await import("./app.js");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is missing from .env");
    }

    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is missing from .env");
    }

    // Connect to MongoDB once
    await connectdb(process.env.MONGODB_URL);

    console.log("Connected to MongoDB successfully");

    // Start HTTP server only after DB connection succeeds
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
