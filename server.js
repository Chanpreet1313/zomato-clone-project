
import dns from "node:dns";

// Fix DNS resolution on your local Windows environment
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
import { connectdb } from "./config/connection.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is missing");
    }

    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is missing");
    }

    await connectdb(process.env.MONGODB_URL);

    const { default: app } = await import("./app.js");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
