const mongoose = require("mongoose");

/**
 * Notification Schema
 * 
 * WHAT IT DOES:
 * Stores real-time campus activity alerts triggered when new lost/found items,
 * events, or polls are published.
 */
const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["lost_item", "found_item", "event", "poll", "match"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedId: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
