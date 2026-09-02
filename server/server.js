const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");

// 1. Load environment variables from .env file into process.env
// MUST be called before using process.env anywhere in the application
dotenv.config();

// 2. Connect to MongoDB database
connectDB();

// 3. Initialize the Express application
const app = express();

// 4. Global Middlewares
// CORS (Cross-Origin Resource Sharing): Allows your React Native app / frontend to talk to this backend
app.use(cors());

// express.json(): Middleware that parses incoming requests with JSON payloads and attaches the data to req.body
// Without this, any req.body in POST or PUT requests will be undefined
app.use(express.json());

// 5. Health Check Route
// A lightweight route used to quickly test if the server is alive and responding
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "CampusConnect API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// 6. Mount Feature Routes
// All authentication endpoints (register, login, me) are grouped under /api/auth
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

// 7. Start the HTTP Server
// If PORT is defined in .env, use it; otherwise fallback to 5000
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});