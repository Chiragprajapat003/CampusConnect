const express = require("express");
const {
  createPoll,
  getPolls,
  votePoll,
  deletePoll,
} = require("../controllers/poll.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * Poll Routes (/api/polls)
 * 
 * Public Routes:
 * - GET /api/polls : List all active polls
 * 
 * Protected Routes:
 * - POST /api/polls          : Create a new campus poll
 * - POST /api/polls/:id/vote : Cast or toggle student vote on an option
 * - DELETE /api/polls/:id    : Delete poll (creator only)
 */

router
  .route("/")
  .get(getPolls)
  .post(protect, createPoll);

router.delete("/:id", protect, deletePoll);
router.post("/:id/vote", protect, votePoll);

module.exports = router;
