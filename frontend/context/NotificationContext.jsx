import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { Storage } from "../lib/storage";
import { triggerSystemNotification } from "../lib/notifications";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Store known notification IDs to detect newly arrived alerts
  const knownNotifIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Fetch notifications and calculate if there are unread alerts
  const checkNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/notifications");
      const list = data?.notifications || [];
      setNotifications(list);

      if (list.length === 0) {
        setHasUnread(false);
        return;
      }

      // Detect brand new notifications that arrived since last poll
      if (!isFirstLoadRef.current) {
        const newIncoming = list.filter((notif) => !knownNotifIdsRef.current.has(notif._id));
        if (newIncoming.length > 0) {
          // Trigger native Android/iOS system notification card for the latest incoming item
          const latest = newIncoming[0];
          triggerSystemNotification({
            title: latest.title,
            body: latest.message,
            data: { relatedId: latest.relatedId, type: latest.type },
          });
        }
      }

      // Update known IDs
      list.forEach((n) => knownNotifIdsRef.current.add(n._id));
      isFirstLoadRef.current = false;

      const lastReadTimeStr = await Storage.getLastReadNotificationTime();

      if (!lastReadTimeStr) {
        // First time user / new account: Start clean (no red dot)
        const nowIso = new Date().toISOString();
        await Storage.setLastReadNotificationTime(nowIso);
        setHasUnread(false);
      } else {
        const lastReadDate = new Date(lastReadTimeStr);
        // Only show red dot if there are new notifications created AFTER lastReadDate
        const hasNew = list.some((notif) => new Date(notif.createdAt) > lastReadDate);
        setHasUnread(hasNew);
      }
    } catch (error) {
      console.log("Notification check info:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkNotifications();
    // Poll for new campus notifications every 10 seconds
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [checkNotifications]);

  // Mark all notifications as read when user taps the bell
  const markAsRead = async () => {
    try {
      const nowIso = new Date().toISOString();
      await Storage.setLastReadNotificationTime(nowIso);
      setHasUnread(false);
    } catch (error) {
      console.error("markAsRead error:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        hasUnread,
        isLoading,
        checkNotifications,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
