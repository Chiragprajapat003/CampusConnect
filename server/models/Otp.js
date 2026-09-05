const mongoose = require("mongoose");

/**
 * OTP Schema
 * 
 * WHAT IT DOES:
 * Stores 6-digit email verification codes.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * MongoDB TTL Index (`expires: 600`): Automatically deletes the document
 * 10 minutes (600 seconds) after creation, so expired OTPs never accumulate in the database.
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 10 minutes TTL
    },
  },
  {
    timestamps: false,
  }
);

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
