const Poll = require("../models/Poll");
const { triggerNotification } = require("./notification.controller");

/**
 * Poll Controller
 * 
 * WHAT IT DOES:
 * Handles creating campus polls, listing active polls, and atomic voting.
 */

/**
 * @desc    Create a new campus poll
 * @route   POST /api/polls
 * @access  Private (Protected by `protect` middleware)
 */
const createPoll = async (req, res) => {
  try {
    const { question, category, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        message: "Poll must have a question and at least 2 distinct options.",
      });
    }

    // Format options array
    const formattedOptions = options
      .map((opt) => (typeof opt === "string" ? opt.trim() : opt?.text?.trim()))
      .filter(Boolean)
      .map((text) => ({ text, votes: [] }));

    if (formattedOptions.length < 2) {
      return res.status(400).json({
        message: "Please provide at least 2 valid option texts.",
      });
    }

    const poll = await Poll.create({
      question: question.trim(),
      category: category || "General",
      options: formattedOptions,
      createdBy: req.user._id,
    });

    const populated = await poll.populate("createdBy", "name email");

    // Broadcast notification
    await triggerNotification({
      type: "poll",
      title: `📊 New Poll: ${poll.question}`,
      message: `${req.user.name || "A student"} launched a new campus poll. Cast your vote now!`,
      relatedId: poll._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Poll created successfully",
      poll: populated,
    });
  } catch (error) {
    console.error("Create Poll Error:", error.message);
    res.status(500).json({
      message: "Server error creating poll",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all active polls with vote counts
 * @route   GET /api/polls
 * @access  Public
 */
const getPolls = async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: polls.length,
      polls,
    });
  } catch (error) {
    console.error("Get Polls Error:", error.message);
    res.status(500).json({
      message: "Server error fetching polls",
      error: error.message,
    });
  }
};

/**
 * @desc    Cast or toggle vote on a poll option
 * @route   POST /api/polls/:id/vote
 * @access  Private (Protected by `protect` middleware)
 */
const votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user._id;

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ message: "optionIndex is required" });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    const targetIndex = parseInt(optionIndex, 10);
    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid optionIndex" });
    }

    // Check if student already voted on this specific option
    const alreadyVotedThisOption = poll.options[targetIndex].votes.some(
      (id) => id.toString() === userId.toString()
    );

    // 1. Remove user vote from ALL options first (one vote per student rule)
    poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((id) => id.toString() !== userId.toString());
    });

    // 2. If student wasn't clicking to un-vote their current choice, add vote to target option
    if (!alreadyVotedThisOption) {
      poll.options[targetIndex].votes.push(userId);
    }

    await poll.save();
    const populated = await poll.populate("createdBy", "name email");

    res.status(200).json({
      message: alreadyVotedThisOption ? "Vote removed" : "Vote recorded!",
      poll: populated,
    });
  } catch (error) {
    console.error("Vote Poll Error:", error.message);
    res.status(500).json({
      message: "Server error recording vote",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete poll (Creator only)
 * @route   DELETE /api/polls/:id
 * @access  Private (Owner only)
 */
const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (poll.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden: You can only delete your own polls.",
      });
    }

    await poll.deleteOne();

    res.status(200).json({
      message: "Poll deleted successfully",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Delete Poll Error:", error.message);
    res.status(500).json({
      message: "Server error deleting poll",
      error: error.message,
    });
  }
};

module.exports = {
  createPoll,
  getPolls,
  votePoll,
  deletePoll,
};
