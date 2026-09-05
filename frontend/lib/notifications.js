import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

let Notifications = null;

try {
  Notifications = require("expo-notifications");

  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  console.log("ℹ️ expo-notifications package not yet loaded:", e.message);
}

/**
 * Register Device for Native Push Notifications
 * 
 * WHAT IT DOES:
 * 1. Creates an Android Notification Channel with MAX priority, vibration and sound.
 * 2. Requests OS-level notification permissions from the student.
 * 3. Retrieves the device Expo Push Token (in production/standalone builds).
 */
export async function registerForPushNotificationsAsync() {
  if (!Notifications || !Notifications.getPermissionsAsync) {
    return null;
  }

  let token = null;

  try {
    // 1. Android Notification Channel Setup (Works seamlessly in Expo Go)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("campus-alerts", {
        name: "Campus Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4F46E5",
        sound: "default",
        enableVibrate: true,
      });
    }

    // 2. Check and Request Notification Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // 3. Obtain Expo Push Token only in Standalone/Production builds
    // (Expo Go SDK 53/54 skips remote token fetch to prevent LogBox red boxes)
    const isExpoGo =
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === "storeClient" ||
      !Constants.expoConfig?.extra?.eas?.projectId;

    if (!isExpoGo) {
      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        token = pushTokenData?.data;

        if (token) {
          await api.post("/auth/push-token", { pushToken: token });
        }
      } catch (tokenErr) {
        // Safe fallback
      }
    }
  } catch (error) {
    console.log("Push notification registration info:", error.message);
  }

  return token;
}

/**
 * Trigger an Instant Native System Notification on the Phone
 * 
 * WHAT IT DOES:
 * Pops up a native Android/iOS system notification card in the status bar & notification shade
 * with sound and vibration (matching Instagram, WhatsApp, system apps).
 */
export async function triggerSystemNotification({ title, body, data = {} }) {
  try {
    if (!Notifications || !Notifications.scheduleNotificationAsync) {
      return;
    }

    // Ensure permissions are granted before scheduling
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "CampusConnect Alert",
        body: body || "New update on campus",
        data,
        sound: "default",
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority?.MAX || "max",
        channelId: "campus-alerts",
      },
      trigger: null, // null = fire immediately
    });
  } catch (error) {
    console.log("triggerSystemNotification error:", error.message);
  }
}
