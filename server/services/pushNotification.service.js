const https = require("https");
const User = require("../models/User");

/**
 * Expo Push Notification Dispatcher
 * 
 * WHAT IT DOES:
 * Broadcasts native push notifications to all campus students' phones
 * (via Expo Push API) so they receive alerts & sounds even when the app is closed.
 */
const sendPushNotification = async ({ title, body, data = {}, excludeUserId = null }) => {
  try {
    // 1. Fetch all students' push tokens from MongoDB (excluding the creator)
    const query = excludeUserId
      ? { _id: { $ne: excludeUserId }, pushTokens: { $exists: true, $not: { $size: 0 } } }
      : { pushTokens: { $exists: true, $not: { $size: 0 } } };

    const users = await User.find(query).select("pushTokens");

    // Gather unique, valid Expo push tokens
    const tokens = [];
    users.forEach((u) => {
      if (Array.isArray(u.pushTokens)) {
        u.pushTokens.forEach((token) => {
          if (token && typeof token === "string" && token.startsWith("ExponentPushToken")) {
            if (!tokens.includes(token)) tokens.push(token);
          }
        });
      }
    });

    if (tokens.length === 0) {
      console.log("ℹ️ No active device push tokens registered yet.");
      return;
    }

    console.log(`📡 Dispatching push notification to ${tokens.length} device(s)...`);

    // 2. Prepare message payloads for Expo Push Gateway
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: title || "CampusConnect Alert",
      body: body || "New update on campus",
      data,
      priority: "high",
      channelId: "campus-alerts",
    }));

    const postData = JSON.stringify(messages);

    // 3. Send HTTP POST to https://exp.host/--/api/v2/push/send
    const options = {
      hostname: "exp.host",
      port: 443,
      path: "/--/api/v2/push/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        console.log("✅ Expo Push Response:", responseBody);
      });
    });

    req.on("error", (err) => {
      console.error("❌ Expo Push Request Error:", err.message);
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error("Push Notification Error:", error.message);
  }
};

module.exports = {
  sendPushNotification,
};
