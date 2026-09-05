const User = require("../models/User");
const Otp = require("../models/Otp");
const Item = require("../models/Item");
const Event = require("../models/Event");
const Poll = require("../models/Poll");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../services/email.service");

/**
 * Helper function to generate signed JWT tokens.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * @desc    Send 6-digit OTP to student's Gmail/Email
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide an email address." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    // Check if an existing verified user already has this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "A user with this email address already exists. Please log in." });
    }

    // Remove any previous OTP for this email
    await Otp.deleteMany({ email: normalizedEmail });

    // Generate new 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store new OTP in database
    await Otp.create({
      email: normalizedEmail,
      otp: otpCode,
    });

    // Send OTP email
    const emailResult = await sendOtpEmail(normalizedEmail, otpCode);

    if (!emailResult.success) {
      // Delete the generated OTP if sending failed so state stays clean
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(500).json({
        success: false,
        message:
          emailResult.error ||
          "Failed to send verification code to your email. Please verify email credentials.",
      });
    }

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
    });
  } catch (error) {
    console.error("Send OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error sending OTP",
      error: error.message,
    });
  }
};

/**
 * @desc    Resend 6-digit OTP to student's Gmail/Email
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOtp = async (req, res) => {
  return sendOtp(req, res);
};

/**
 * @desc    Verify OTP to activate student account
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide both email and OTP." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified. Please log in." });
    }

    // Validate OTP code
    const validOtp = await Otp.findOne({
      email: normalizedEmail,
      otp: otp.trim(),
    });

    if (!validOtp) {
      return res.status(400).json({
        message: "Invalid or expired OTP code. Please request a new code.",
      });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete verified OTP record
    await Otp.deleteMany({ email: normalizedEmail });

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in.",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    res.status(500).json({
      message: "Server error verifying OTP",
      error: error.message,
    });
  }
};

/**
 * @desc    Register a new user (with OTP verification)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email, and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    // 2. Password strength check
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // 3. Check if user already registered & verified
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        message: "A user with this email address already exists. Please log in.",
      });
    }

    // 4. Validate OTP if provided in request
    if (otp) {
      const validOtp = await Otp.findOne({
        email: normalizedEmail,
        otp: otp.trim(),
      });

      if (!validOtp) {
        return res.status(400).json({
          message: "Invalid or expired OTP code. Please try again or request a new code.",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      let avatarUrl = "";
      if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`;
      }

      let user;
      if (existingUser) {
        existingUser.name = name.trim();
        existingUser.passwordHash = passwordHash;
        existingUser.phone = phone ? phone.trim() : "";
        if (avatarUrl) existingUser.avatarUrl = avatarUrl;
        existingUser.isVerified = true;
        user = await existingUser.save();
      } else {
        user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          phone: phone ? phone.trim() : "",
          avatarUrl,
          isVerified: true,
        });
      }

      // Delete verified OTP record
      await Otp.deleteMany({ email: normalizedEmail });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: "Registration successful!",
        token,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          isVerified: user.isVerified,
        },
      });
    }

    // If no OTP provided: create unverified user and send OTP (fallback flow)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let avatarUrl = "";
    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    let user;
    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.passwordHash = passwordHash;
      existingUser.phone = phone ? phone.trim() : "";
      if (avatarUrl) existingUser.avatarUrl = avatarUrl;
      user = await existingUser.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? phone.trim() : "",
        avatarUrl,
        isVerified: false,
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: normalizedEmail });
    await Otp.create({
      email: normalizedEmail,
      otp: otpCode,
    });

    const emailResult = await sendOtpEmail(normalizedEmail, otpCode);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message:
          emailResult.error ||
          "Failed to send verification email. Please check server email credentials.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration started! Please check your email for the verification code.",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
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

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide both email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
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

/**
 * @desc    Update student profile details (name, phone, avatar)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (req.file) {
      user.avatarUrl = `/uploads/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully! ✨",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    res.status(500).json({
      message: "Server error updating profile",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all student activity history (Uploads, Created Polls, Events, Votes)
 * @route   GET /api/auth/activity
 * @access  Private
 */
const getUserActivity = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user's uploaded Lost & Found items
    const myItems = await Item.find({ reportedBy: userId }).sort({ createdAt: -1 });

    // 2. Fetch user's hosted campus events
    const myEvents = await Event.find({ createdBy: userId }).sort({ createdAt: -1 });

    // 3. Fetch user's launched campus polls
    const myPolls = await Poll.find({ createdBy: userId }).sort({ createdAt: -1 });

    // 4. Fetch polls the user has voted in
    const votedPolls = await Poll.find({ "options.votes": userId }).sort({ createdAt: -1 });

    // 5. Fetch events the user RSVP'd for
    const rsvpedEvents = await Event.find({ rsvps: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      stats: {
        totalUploads: myItems.length + myEvents.length + myPolls.length,
        itemsReported: myItems.length,
        eventsHosted: myEvents.length,
        pollsCreated: myPolls.length,
        pollsVoted: votedPolls.length,
        eventsRsvped: rsvpedEvents.length,
      },
      myUploads: {
        items: myItems,
        events: myEvents,
        polls: myPolls,
      },
      myReactions: {
        votedPolls,
        rsvpedEvents,
      },
    });
  } catch (error) {
    console.error("Get User Activity Error:", error.message);
    res.status(500).json({
      message: "Server error fetching user activity",
      error: error.message,
    });
  }
};

/**
 * @desc    Save/Register device expo push token for background notifications
 * @route   POST /api/auth/push-token
 * @access  Private
 */
const savePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ message: "pushToken is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pushTokens.includes(pushToken)) {
      user.pushTokens.push(pushToken);
      await user.save();
    }

    res.status(200).json({
      message: "Push token registered successfully",
    });
  } catch (error) {
    console.error("Save Push Token Error:", error.message);
    res.status(500).json({
      message: "Server error saving push token",
      error: error.message,
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  register,
  login,
  getMe,
  updateProfile,
  getUserActivity,
  savePushToken,
};