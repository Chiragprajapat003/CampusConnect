const path = require("path");
const dotenv = require("dotenv");

// 1. Explicitly load environment variables from server/.env using absolute path
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

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

// express.urlencoded(): Parses URL-encoded data from standard HTML forms if sent
app.use(express.urlencoded({ extended: true }));

// Static file serving: makes uploaded item images accessible via URL e.g. http://localhost:5000/uploads/item-xxx.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

// All Lost & Found item endpoints are grouped under /api/items
const itemRoutes = require("./routes/item.routes");
app.use("/api/items", itemRoutes);

// All Campus Event endpoints are grouped under /api/events
const eventRoutes = require("./routes/event.routes");
app.use("/api/events", eventRoutes);

// All Campus Poll endpoints are grouped under /api/polls
const pollRoutes = require("./routes/poll.routes");
app.use("/api/polls", pollRoutes);

// All Campus Notification endpoints are grouped under /api/notifications
const notificationRoutes = require("./routes/notification.routes");
app.use("/api/notifications", notificationRoutes);

// 7. Start the HTTP Server
// If PORT is defined in .env, use it; otherwise fallback to 5000
const PORT = process.env.PORT || 5000;
const { verifyEmailTransporter } = require("./services/email.service");

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Auth & Profile routes mounted at /api/auth (including /activity & /profile)`);
  console.log(`📊 Polls & Events routes mounted at /api/polls and /api/events`);
  // Verify SMTP Transporter during startup
  await verifyEmailTransporter();
});