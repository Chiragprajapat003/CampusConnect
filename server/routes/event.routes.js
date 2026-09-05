const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  toggleRSVP,
  deleteEvent,
} = require("../controllers/event.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

/**
 * Event Routes (/api/events)
 * 
 * Public Routes:
 * - GET  /api/events     : List events (search, category filter)
 * - GET  /api/events/:id : Get single event details
 * 
 * Protected Routes:
 * - POST /api/events          : Create event with optional banner image
 * - POST /api/events/:id/rsvp : Toggle student RSVP status
 * - DELETE /api/events/:id    : Delete event (creator only)
 */

router
  .route("/")
  .get(getEvents)
  .post(protect, upload.single("image"), createEvent);

router
  .route("/:id")
  .get(getEventById)
  .delete(protect, deleteEvent);

router.post("/:id/rsvp", protect, toggleRSVP);

module.exports = router;
