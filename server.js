import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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

// Redis


// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173"], // Frontend domain(s)
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Include custom headers if used
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({limit:"50mb" ,extended: true }));
app.use(cookieParser());
client.on("connect", () => {
  console.log("Connected to redis");
});

client.on("error", (error) => {
  console.log("redis connection error", error);
});


// Routes
app.use("/api/admin", adminRoute); 
app.use("/api/user", userRouter);
app.use("/api/google",googleRoute)

app.use(errorHandler);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

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
