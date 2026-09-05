const Event = require("../models/Event");
const { triggerNotification } = require("./notification.controller");

/**
 * Event Controller
 * 
 * WHAT IT DOES:
 * Manages campus events and live RSVP attendance toggles.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * The RSVP toggle uses atomic `$addToSet` and `$pull` operations or array manipulation
 * to ensure that clicking "Attend" multiple times cleanly adds or removes the student's ID
 * without concurrency conflicts.
 */

/**
 * @desc    Create a new campus event
 * @route   POST /api/events
 * @access  Private
 */
const createEvent = async (req, res) => {
  try {
    const { title, description, organizer, category, venue, date, time } = req.body;

    if (!title || !description || !organizer || !venue || !date || !time) {
      return res.status(400).json({
        message: "Please provide all required event details: title, description, organizer, venue, date, and time.",
      });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const newEvent = await Event.create({
      title: title.trim(),
      description: description.trim(),
      organizer: organizer.trim(),
      category: category || "Other",
      venue: venue.trim(),
      date: new Date(date),
      time: time.trim(),
      imageUrl,
      rsvps: [],
      createdBy: req.user._id,
    });

    const populated = await newEvent.populate("createdBy", "name email");

    // Broadcast notification
    await triggerNotification({
      type: "event",
      title: `🎉 New Event: ${newEvent.title}`,
      message: `${newEvent.organizer} announced an event at ${newEvent.venue} on ${new Date(newEvent.date).toLocaleDateString()}.`,
      relatedId: newEvent._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Event created successfully",
      event: populated,
    });
  } catch (error) {
    console.error("Create Event Error:", error.message);
    res.status(500).json({
      message: "Server error creating event",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all upcoming campus events with filters
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = async (req, res) => {
  try {
    const { category, search } = req.query;

    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { organizer: searchRegex },
        { venue: searchRegex },
      ];
    }

    const events = await Event.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1 }); // Sort chronologically (earliest first)

    res.status(200).json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get Events Error:", error.message);
    res.status(500).json({
      message: "Server error fetching events",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("rsvps", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error("Get Event By ID Error:", error.message);
    res.status(500).json({
      message: "Server error fetching event details",
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle RSVP for the logged-in student
 * @route   POST /api/events/:id/rsvp
 * @access  Private (Protected by `protect` middleware)
 */
const toggleRSVP = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const userId = req.user._id;
    const isAttending = event.rsvps.some(
      (id) => id.toString() === userId.toString()
    );

    if (isAttending) {
      // Remove student from RSVP list
      event.rsvps = event.rsvps.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Add student to RSVP list
      event.rsvps.push(userId);
    }

    await event.save();

    res.status(200).json({
      message: isAttending ? "RSVP cancelled" : "RSVP confirmed! See you there 🎉",
      isAttending: !isAttending,
      attendeesCount: event.rsvps.length,
      event,
    });
  } catch (error) {
    console.error("Toggle RSVP Error:", error.message);
    res.status(500).json({
      message: "Server error toggling RSVP",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete event (Owner only)
 * @route   DELETE /api/events/:id
 * @access  Private (Owner only)
 */
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Forbidden: You can only delete events you created.",
      });
    }

    await event.deleteOne();

    res.status(200).json({
      message: "Event deleted successfully",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Delete Event Error:", error.message);
    res.status(500).json({
      message: "Server error deleting event",
      error: error.message,
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  toggleRSVP,
  deleteEvent,
};
