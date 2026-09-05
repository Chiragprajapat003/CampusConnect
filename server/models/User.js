const mongoose = require("mongoose");

/**
 * User Schema
 * 
 * Defines the structure of user documents in MongoDB.
 * - email: Marked as unique and indexed automatically for fast lookups during login/registration.
 * - passwordHash: We NEVER store plaintext passwords; only the irreversible bcrypt hash.
 * - phone: Optional phone number used so other students can call/message when an item is found.
 * - timestamps: Automatically adds `createdAt` and `updatedAt` date fields.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "College email is required"],
      unique: true,
      lowercase: true, // Always normalize to lowercase to prevent duplicate registrations like User@college.edu vs user@college.edu
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    phone: {
      type: String,
      trim: true,
      default: "", // Optional: for the "Contact the reporter" feature
    },
    avatarUrl: {
      type: String,
      default: "", // Path to student's uploaded profile photo
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    pushTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;