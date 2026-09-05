import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { COLORS, API_BASE_URL } from "../../lib/config";
import NotificationModal from "../../components/NotificationModal";

/**
 * Home Screen (Starter Dashboard matching Stitch Design)
 * 
 * WHAT IT DOES:
 * Welcomes the authenticated student, displays their verified college badge,
 * student avatar, real-time campus activity notifications, and quick action cards.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { hasUnread } = useNotifications();
  const insets = useSafeAreaInsets();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");
  const avatarFullUrl = user?.avatarUrl ? `${imageHostUrl}${user.avatarUrl}` : null;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || "Student"} 👋</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.notifIconButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => setIsNotifOpen(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              {hasUnread && <View style={[styles.badgeDot, { backgroundColor: colors.error }]} />}
            </TouchableOpacity>
          </View>
        </View>

        <NotificationModal visible={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

        {/* User College Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {avatarFullUrl ? (
            <Image source={{ uri: avatarFullUrl }} style={styles.avatarPhoto} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileEmail, { color: colors.textPrimary }]}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.foundBg }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.foundText} />
                <Text style={[styles.verifiedText, { color: colors.foundText }]}>Verified Student</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Highlights */}
        <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Campus Hub</Text>
        <View style={styles.quickActionGrid}>
          {/* Lost & Found Card */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/lost-found")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.lostBg }]}>
              <Ionicons name="search" size={24} color={colors.lostText} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Lost & Found Feed</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Browse all reported items or search for missing belongings
            </Text>
          </TouchableOpacity>

          {/* Campus Events Card */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/events")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="calendar" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Campus Event Board</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Discover workshops, hackathons & RSVP with live attendee counts
            </Text>
          </TouchableOpacity>

          {/* Report New Item Card */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/report")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconBg, { backgroundColor: colors.foundBg }]}>
              <Ionicons name="add-circle" size={24} color={colors.foundText} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Report Lost or Found Item</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Take a photo, tag GPS location, and publish a report
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout Action Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.errorBg }]}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Sign Out of CampusConnect</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.errorBg,
    justifyContent: "center",
    alignItems: "center",
  },
  notifIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  avatarPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.foundBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foundText,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  quickActionGrid: {
    gap: 14,
    marginBottom: 28,
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.errorBg,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "600",
  },
});
