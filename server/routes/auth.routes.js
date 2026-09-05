const express = require("express");
const {
  sendOtp,
  verifyOtp,
  resendOtp,
  register,
  login,
  getMe,
  updateProfile,
  getUserActivity,
  savePushToken,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

/**
 * Authentication & Student Profile Routes
 * 
 * Public Routes:
 * - POST /api/auth/send-otp   : Sends 6-digit OTP to student's Gmail
 * - POST /api/auth/resend-otp : Resends 6-digit OTP to student's Gmail
 * - POST /api/auth/verify-otp : Verifies the 6-digit OTP to activate account
 * - POST /api/auth/register   : Registers account with OTP verification
 * - POST /api/auth/login      : Validates credentials and returns a JWT (if verified)
 * 
 * Protected Routes:
 * - GET  /api/auth/me         : Returns current user data
 * - PUT  /api/auth/profile    : Updates name, phone, and profile photo avatar
 * - GET  /api/auth/activity   : Returns student's personal upload & reaction history
 * - POST /api/auth/push-token : Registers device push token for notifications
 */

// Public routes
router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", upload.single("avatar"), register);
router.post("/login", login);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, upload.single("avatar"), updateProfile);
router.get("/activity", protect, getUserActivity);
router.post("/push-token", protect, savePushToken);

module.exports = router;