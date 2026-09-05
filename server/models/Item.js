const mongoose = require("mongoose");

/**
 * Item Schema (Lost & Found)
 * 
 * WHAT IT DOES:
 * Defines the MongoDB schema for lost and found reports posted by students.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * - `type`: Distinguishes between items that were 'lost' by a student vs 'found' by a good samaritan.
 * - `status`: 'active' means currently missing/unclaimed, 'resolved' means returned/claimed.
 * - `location`: Stores human-readable place name (e.g. "Main Library 2nd Floor") along with optional GPS coordinates for map pinning.
 * - `createdBy`: Foreign key reference to the `User` collection. This lets us use `.populate('createdBy')` to fetch the student's name, email, and phone number when someone wants to contact them.
 */
const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
      maxLength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxLength: [1000, "Description cannot exceed 1000 characters"],
    },
    type: {
      type: String,
      required: [true, "Item type is required"],
      enum: {
        values: ["lost", "found"],
        message: "Item type must be either 'lost' or 'found'",
      },
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Electronics",
          "Cards & Wallets",
          "Keys",
          "Clothing",
          "Books & Notes",
          "Bottles & Containers",
          "Accessories",
          "Other",
        ],
        message: "Please select a valid category",
      },
      default: "Other",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "resolved"],
        message: "Status must be either 'active' or 'resolved'",
      },
      default: "active",
    },
    imageUrl: {
      type: String,
      default: "", // Stores relative path e.g. "/uploads/item-123.jpg" or full URL
    },
    location: {
      name: {
        type: String,
        required: [true, "Location name is required (e.g. Library, Cafeteria, Sports Complex)"],
        trim: true,
      },
      latitude: {
        type: Number,
        default: null, // Captured via expo-location GPS
      },
      longitude: {
        type: Number,
        default: null, // Captured via expo-location GPS
      },
    },
    date: {
      type: Date,
      default: Date.now, // Date when the item was lost or found
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator user ID is required"],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Add text indexes on title and description to optimize keyword searching and smart matching later
itemSchema.index({ title: "text", description: "text" });

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
