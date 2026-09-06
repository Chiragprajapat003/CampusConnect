import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Secure Token Storage Helper
 * 
 * WHAT IT DOES:
 * Encrypts and persists sensitive authentication tokens (JWT) and cached user data.
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * - On iOS/Android, `expo-secure-store` leverages hardware-backed encryption
 *   (iOS Keychain and Android EncryptedSharedPreferences).
 * - Standard `AsyncStorage` is stored unencrypted in plain text, making it vulnerable to extraction.
 * - For Web environments, SecureStore is not available, so we provide a safe fallback to `localStorage`.
 */

const TOKEN_KEY = "campusconnect_auth_token";
const USER_KEY = "campusconnect_user_data";

export const Storage = {
  // Save JWT token
  async setToken(token) {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
        }
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (error) {
      console.error("Storage setToken Error:", error);
    }
  },

  // Retrieve JWT token
  async getToken() {
    try {
      if (Platform.OS === "web") {
        return typeof localStorage !== "undefined"
          ? localStorage.getItem(TOKEN_KEY)
          : null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error("Storage getToken Error:", error);
      return null;
    }
  },

  // Remove JWT token
  async removeToken() {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error("Storage removeToken Error:", error);
    }
  },

  // Save serialized user profile
  async setUser(user) {
    try {
      const json = JSON.stringify(user);
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(USER_KEY, json);
        }
      } else {
        await SecureStore.setItemAsync(USER_KEY, json);
      }
    } catch (error) {
      console.error("Storage setUser Error:", error);
    }
  },

  // Retrieve serialized user profile
  async getUser() {
    try {
      let json = null;
      if (Platform.OS === "web") {
        json = typeof localStorage !== "undefined" ? localStorage.getItem(USER_KEY) : null;
      } else {
        json = await SecureStore.getItemAsync(USER_KEY);
      }
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error("Storage getUser Error:", error);
      return null;
    }
  },

  // Clear all auth storage on logout
  async clearAll() {
    await this.removeToken();
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(USER_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch (error) {
      console.error("Storage clearAll Error:", error);
    }
  },

  // Save last viewed notification timestamp
  async setLastReadNotificationTime(isoTimestamp) {
    try {
      if (Platform.OS === "web") {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("campusconnect_last_notif_time", isoTimestamp);
        }
      } else {
        await SecureStore.setItemAsync("campusconnect_last_notif_time", isoTimestamp);
      }
    } catch (error) {
      console.error("Storage setLastReadNotificationTime Error:", error);
    }
  },

  // Get last viewed notification timestamp
  async getLastReadNotificationTime() {
    try {
      if (Platform.OS === "web") {
        return typeof localStorage !== "undefined"
          ? localStorage.getItem("campusconnect_last_notif_time")
          : null;
      }
      return await SecureStore.getItemAsync("campusconnect_last_notif_time");
    } catch (error) {
      return null;
    }
  },
};

export const getStorageItem = async (key) => {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    return null;
  }
};

export const setStorageItem = async (key, value) => {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error("Storage setItem Error:", error);
  }
};
