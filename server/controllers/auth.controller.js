const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Helper function to generate signed JWT tokens.
 * Centralizing token generation avoids duplicate code across register and login.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * @desc    Register a new user with a valid college email
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields: name, email, and password.",
      });
    }

    // 2. Validate college email domain (must end with .edu or your specific college domain)
    // We check for '@college.edu' or '.edu' to enforce university-only membership
    const normalizedEmail = email.toLowerCase().trim();
    const isCollegeEmail =
      normalizedEmail.endsWith(".edu") ||
      normalizedEmail.endsWith("@college.edu") ||
      normalizedEmail.endsWith("@campus.edu");

    if (!isCollegeEmail) {
      return res.status(400).json({
        message:
          "Registration restricted to students. Please use your valid college email address (e.g. name@college.edu).",
      });
    }

    // 3. Password strength check (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // 4. Check if a user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "A user with this email address already exists.",
      });
    }

    // 5. Hash password with bcrypt before storing in the database
    // Salt rounds = 10 provides a strong balance between cryptographic security and performance
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Create and save the new user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone ? phone.trim() : "",
      isVerified: false,
    });

    // 7. Generate JWT token
    const token = generateToken(user._id);

    // 8. Return response without sensitive fields (omit passwordHash)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

/**
 * @desc    Authenticate existing user and return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Look up the user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Use generic error message for security (prevents user enumeration attacks)
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // 3. Compare provided plaintext password against the stored bcrypt hash
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user._id);

    // 5. Send back user data and token
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by `protect` middleware)
 */
const getMe = async (req, res) => {
  try {
    // req.user was already fetched and attached by the `protect` middleware
    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error("GetMe Error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user profile",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};