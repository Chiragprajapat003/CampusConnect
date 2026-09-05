const Notification = require("../models/Notification");
const { sendPushNotification } = require("../services/pushNotification.service");

/**
 * Notification Controller
 * 
 * WHAT IT DOES:
 * Manages fetching campus alert notifications and provides a reusable helper
 * for creating broadcast notifications whenever items, events, or polls are posted.
 */

/**
 * Helper to create a notification document and send native push alert to student phones
 */
const triggerNotification = async ({ type, title, message, relatedId, createdBy }) => {
  try {
    // 1. Save in-app notification document
    await Notification.create({
      type,
      title,
      message,
      relatedId: relatedId ? relatedId.toString() : "",
      createdBy,
    });

    // 2. Dispatch native push notification to student phones
    await sendPushNotification({
      title,
      body: message,
      data: { type, relatedId: relatedId ? relatedId.toString() : "" },
      excludeUserId: createdBy,
    });
  } catch (error) {
    console.error("Trigger Notification Error:", error.message);
  }
};

/**
 * @desc    Get latest campus notifications
 * @route   GET /api/notifications
 * @access  Public
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error.message);
    res.status(500).json({
      message: "Server error fetching notifications",
      error: error.message,
    });
  }
};

module.exports = {
  triggerNotification,
  getNotifications,
};
