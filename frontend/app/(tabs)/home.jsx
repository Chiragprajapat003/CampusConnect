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
import * as Animatable from "react-native-animatable";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { COLORS, API_BASE_URL } from "../../lib/config";
import NotificationModal from "../../components/NotificationModal";

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const hasUnread = notifications.some((n) => !n.read);

  // Construct full avatar URL if necessary
  const avatarFullUrl =
    user?.avatar && user.avatar.startsWith("/uploads/")
      ? `${API_BASE_URL.replace("/api", "")}${user.avatar}`
      : user?.avatar;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Bar */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.topBar}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.primary }]}>{user?.name || "Student"} 👋</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => setIsNotifOpen(true)}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              {hasUnread && <View style={[styles.badgeDot, { backgroundColor: colors.error }]} />}
            </TouchableOpacity>
          </View>
        </Animatable.View>

        <NotificationModal visible={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

        {/* User College Card */}
        <Animatable.View animation="fadeIn" delay={300} duration={800} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {avatarFullUrl ? (
            <Image source={{ uri: avatarFullUrl }} style={styles.avatarPhoto} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarPlaceholderText, { color: colors.primary }]}>
                {user?.name?.charAt(0)?.toUpperCase() || "S"}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileEmail, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>Verified Student</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Status Highlights */}
        <Animatable.Text animation="fadeInUp" delay={400} style={styles.sectionHeader}>Campus Hub</Animatable.Text>
        
        {/* Full width "Smart Match" style banner */}
        <Animatable.View animation="fadeInUp" delay={500} style={{ width: "100%", marginBottom: 16 }}>
          <TouchableOpacity
            style={styles.actionCardContainer}
            onPress={() => router.push("/(tabs)/lost-found")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#8B5CF6", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionIconBg}>
                <Ionicons name="search" size={24} color="#FFF" />
              </View>
              <Text style={styles.actionTitle}>Lost & Found Feed</Text>
              <Text style={styles.actionSubtitle}>
                Browse all reported items or search for missing belongings
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>

        <View style={styles.quickActionGrid}>
          {/* Campus Events Card - Vibrant Orange */}
          <Animatable.View animation="fadeInUp" delay={600} style={styles.gridCardWrapper}>
            <TouchableOpacity
              style={styles.actionCardContainer}
              onPress={() => router.push("/(tabs)/events")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#F97316", "#F59E0B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconBg}>
                  <Ionicons name="calendar" size={24} color="#FFF" />
                </View>
                <Text style={styles.actionTitle}>Events</Text>
                <Text style={styles.actionSubtitle}>
                  Live campus sessions
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>

          {/* Report New Item Card - Vibrant Pink */}
          <Animatable.View animation="fadeInUp" delay={700} style={styles.gridCardWrapper}>
            <TouchableOpacity
              style={styles.actionCardContainer}
              onPress={() => router.push("/(tabs)/report")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#EC4899", "#E11D48"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconBg}>
                  <Ionicons name="add-circle" size={24} color="#FFF" />
                </View>
                <Text style={styles.actionTitle}>Report Item</Text>
                <Text style={styles.actionSubtitle}>
                  Found or lost something?
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        </View>

        {/* Logout Action Button */}
        <Animatable.View animation="fadeIn" delay={900}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.errorBg }]}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.logoutButtonText, { color: colors.error }]}>Sign Out of CampusConnect</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  avatarPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Light green bg
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    color: "#0F172A",
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCardContainer: {
    width: "100%",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden", // Keep gradient inside rounded corners
    marginBottom: 16,
  },
  actionCardGradient: {
    padding: 24,
    width: "100%",
    minHeight: 140, // Ensures the card has a nice size without exploding
    justifyContent: "space-between",
  },
  gridCardWrapper: {
    width: "48%",
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
