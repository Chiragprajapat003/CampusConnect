const mongoose = require("mongoose");

/**
 * Poll Schema
 * 
 * WHAT IT DOES:
 * Stores campus opinion polls and live voting records.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * Each option in `options` stores an array of User ObjectIds (`votes`).
 * This prevents duplicate voting from the same student on a single option,
 * and allows calculating percentages accurately: (option.votes.length / totalVotes) * 100.
 */
const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Poll question is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["Campus Life", "Events & Fest", "Academics", "Food & Mess", "Sports", "General"],
      default: "General",
    },
    options: [
      {
        text: {
          type: String,
          required: [true, "Option text is required"],
          trim: true,
        },
        votes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
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

// Virtual property to calculate total votes across all options
pollSchema.virtual("totalVotes").get(function () {
  if (!this.options) return 0;
  return this.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
});

pollSchema.set("toJSON", { virtuals: true });
pollSchema.set("toObject", { virtuals: true });

const Poll = mongoose.model("Poll", pollSchema);

module.exports = Poll;
