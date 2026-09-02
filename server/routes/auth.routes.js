const express = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Authentication Routes
 * 
 * Public Routes:
 * - POST /api/auth/register : Creates a new account with college email validation
 * - POST /api/auth/login    : Validates credentials and returns a JWT
 * 
 * Protected Routes:
 * - GET  /api/auth/me       : Returns current user data (requires valid Bearer token)
 */

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (uses `protect` middleware to verify JWT before invoking getMe)
router.get("/me", protect, getMe);

module.exports = router;