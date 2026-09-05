const mongoose = require("mongoose");

/**
 * Event Schema
 * 
 * WHAT IT DOES:
 * Defines the MongoDB schema for campus events (workshops, club activities, hackathons).
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * - `rsvps`: An array of User ObjectIds. When a student RSVPs, their `_id` is pushed to this array.
 *   This allows us to prevent duplicate RSVPs, calculate total attendee count (`rsvps.length`),
 *   and instantly check if the currently logged-in student has RSVP'd.
 */
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },
    organizer: {
      type: String,
      required: [true, "Event organizer / club name is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Workshop", "Tech Talk", "Hackathon", "Social", "Sports", "Cultural", "Career", "Other"],
      default: "Other",
    },
    venue: {
      type: String,
      required: [true, "Event venue / location is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    time: {
      type: String,
      required: [true, "Event time is required (e.g. 5:00 PM - 7:00 PM)"],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    rsvps: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to calculate total attendee count dynamically
eventSchema.virtual("attendeesCount").get(function () {
  return this.rsvps ? this.rsvps.length : 0;
});

// Ensure virtuals are included when converting to JSON/Object for API responses
eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
