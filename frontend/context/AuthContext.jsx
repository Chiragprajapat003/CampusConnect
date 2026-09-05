import React, { createContext, useContext, useState, useEffect } from "react";
import { Storage } from "../lib/storage";
import { api } from "../lib/api";
import { registerForPushNotificationsAsync } from "../lib/notifications";

/**
 * Authentication Context & Provider
 * 
 * WHAT IT DOES:
 * Holds global auth state (`user`, `token`, `isLoading`, `isAuthenticated`) and provides
 * `login()`, `register()`, `logout()`, and `refreshUser()` functions to any component in the app.
 * Automatically requests and syncs Expo Push Tokens for background notifications.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial bootstrap: check if a token already exists in secure storage
  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedToken = await Storage.getToken();
        const cachedUser = await Storage.getUser();

        if (storedToken) {
          setToken(storedToken);
          if (cachedUser) {
            setUser(cachedUser);
          }

          // Validate token against backend to ensure it hasn't expired
          try {
            const data = await api.get("/auth/me");
            if (data.user) {
              setUser(data.user);
              await Storage.setUser(data.user);
              // Register device push token for background notifications
              registerForPushNotificationsAsync();
            }
          } catch (err) {
            console.warn("Stored token is invalid or expired. Logging out.");
            await Storage.clearAll();
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth bootstrap error:", error);
      } finally {
        // App is ready to render routes
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  // 2. Login action
  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    
    // Save to Secure Storage
    await Storage.setToken(data.token);
    await Storage.setUser(data.user);

    // Update React State
    setToken(data.token);
    setUser(data.user);

    // Register push notifications
    registerForPushNotificationsAsync();

    return data;
  };

  // 3. Send OTP to Gmail
  const sendOtp = async (email) => {
    return await api.post("/auth/send-otp", { email });
  };

  // 4. Register action with OTP and avatar support
  const register = async ({ name, email, password, phone, otp, avatarUri }) => {
    let data;

    if (avatarUri) {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("phone", phone || "");
      formData.append("otp", otp);

      const filename = avatarUri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const extension = match ? match[1].toLowerCase() : "jpg";
      const mimeType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
          ? "image/webp"
          : "image/jpeg";

      formData.append("avatar", {
        uri: avatarUri,
        name: filename,
        type: mimeType,
      });

      data = await api.post("/auth/register", formData);
    } else {
      data = await api.post("/auth/register", {
        name,
        email,
        password,
        phone,
        otp,
      });
    }

    // Save to Secure Storage
    await Storage.setToken(data.token);
    await Storage.setUser(data.user);
    await Storage.setLastReadNotificationTime(new Date().toISOString());

    // Update React State
    setToken(data.token);
    setUser(data.user);

    // Register push notifications
    registerForPushNotificationsAsync();

    return data;
  };

  // 4. Logout action
  const logout = async () => {
    await Storage.clearAll();
    setToken(null);
    setUser(null);
  };

  // 5. Refresh current user profile
  const refreshUser = async () => {
    try {
      const data = await api.get("/auth/me");
      if (data.user) {
        setUser(data.user);
        await Storage.setUser(data.user);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  // 6. Update user profile (name, phone, avatar)
  const updateUserProfile = async ({ name, phone, avatarUri }) => {
    let data;
    if (avatarUri) {
      const formData = new FormData();
      formData.append("name", name || "");
      formData.append("phone", phone || "");

      const filename = avatarUri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const extension = match ? match[1].toLowerCase() : "jpg";
      const mimeType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
          ? "image/webp"
          : "image/jpeg";

      formData.append("avatar", {
        uri: avatarUri,
        name: filename,
        type: mimeType,
      });

      data = await api.put("/auth/profile", formData);
    } else {
      data = await api.put("/auth/profile", { name, phone });
    }

    if (data.user) {
      setUser(data.user);
      await Storage.setUser(data.user);
    }

    return data;
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    sendOtp,
    login,
    register,
    logout,
    refreshUser,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom Hook: useAuth
 * Allows any screen or component to easily access auth state: `const { user, logout } = useAuth();`
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
