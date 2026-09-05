import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";

/**
 * Campus Activity & Notification Modal
 * 
 * WHAT IT DOES:
 * Displays real-time alerts whenever a new lost/found item, event, or poll is published.
 * Tapping a notification navigates directly to the relevant screen or item.
 * Automatically clears the unread red dot when opened.
 */
export default function NotificationModal({ visible, onClose }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { notifications, isLoading, checkNotifications, markAsRead } = useNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      // Mark notifications as read so red dot disappears
      markAsRead();
    }
  }, [visible]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkNotifications();
    setIsRefreshing(false);
  };

  const handleNotificationPress = (item) => {
    onClose();
    if (item.type === "lost_item" || item.type === "found_item") {
      if (item.relatedId) {
        router.push(`/item/${item.relatedId}`);
      } else {
        router.push("/(tabs)/lost-found");
      }
    } else if (item.type === "event" || item.type === "poll") {
      router.push("/(tabs)/events");
    }
  };

  const getIconAndColor = (type) => {
    switch (type) {
      case "lost_item":
        return { name: "search", color: colors.lostText, bg: colors.lostBg };
      case "found_item":
        return { name: "gift", color: colors.foundText, bg: colors.foundBg };
      case "event":
        return { name: "calendar", color: colors.primary, bg: colors.primaryLight };
      case "poll":
        return { name: "stats-chart", color: "#10B981", bg: "#D1FAE5" };
      default:
        return { name: "notifications", color: colors.primary, bg: colors.primaryLight };
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={styles.titleGroup}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Campus Alerts</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading alerts...</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => {
                    setIsRefreshing(true);
                    fetchNotifications();
                  }}
                  colors={[colors.primary]}
                />
              }
              renderItem={({ item }) => {
                const { name, color, bg } = getIconAndColor(item.type);
                return (
                  <TouchableOpacity
                    style={[styles.notifItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
                      <Ionicons name={name} size={18} color={color} />
                    </View>

                    <View style={styles.textContainer}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.timeAgoText, { color: colors.textMuted }]}>
                          {formatTimeAgo(item.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Notifications Yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    When students report items, announce events, or launch polls, you'll see alerts here!
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    height: "75%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 2,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  timeAgoText: {
    fontSize: 11,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
