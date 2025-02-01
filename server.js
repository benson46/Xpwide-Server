import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import adminRoute from "./routes/adminRoute.js";
import userRouter from "./routes/userRoutes.js";
import client from "./config/redis.js";
import googleRoute from "./routes/googleRoute.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Redis Connection
client.on("connect", () => console.log("Connected to Redis"));
client.on("error", (error) => console.log("Redis connection error", error));

// ✅ Set up Morgan Logging
const logDirectory = path.join("logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const accessLogStream = fs.createWriteStream(path.join(logDirectory, "access.log"), { flags: "a" });

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined", { stream: accessLogStream })); // Logs to file in production
} else {
  app.use(morgan("dev")); // Logs to console in development
}

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"], 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], 
    allowedHeaders: ["Content-Type", "Authorization", "User-Email"], 
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/admin", adminRoute);
app.use("/api/user", userRouter);
app.use("/api/google", googleRoute);

// Global error handler
app.use(errorHandler);

// Connect to database and start the server
(async () => {
  try {
    await client.connect();
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to connect to database", error);
  }
})();
