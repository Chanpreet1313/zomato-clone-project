import dns from "dns";
import dotenv from "dotenv";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const { default: app } = await import("./app.js");
const { connectdb } = await import("./config/connection.js");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectdb(process.env.MONGODB_URL);

        console.log("Connected to MongoDB successfully");

        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

startServer();