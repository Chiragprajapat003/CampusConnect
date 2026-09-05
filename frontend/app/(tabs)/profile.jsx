import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../lib/api";
import { API_BASE_URL } from "../../lib/config";

/**
 * Student Profile & Activity Hub
 * 
 * WHAT IT DOES:
 * 1. Displays verified student profile & avatar with instant photo updates.
 * 2. Edit Profile Modal (Name, Phone Number, Profile Picture).
 * 3. Activity Statistics (Total Uploads, Items Reported, Events Hosted, Votes Cast).
 * 4. Interactive Activity History Tabs ("📤 My Uploads" & "⚡ My Activity / Reactions").
 * 5. App Theme & Safe Logout settings.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUserProfile } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();

  // Activity History States
  const [activeTab, setActiveTab] = useState("uploads"); // 'uploads' | 'activity'
  const [uploadFilter, setUploadFilter] = useState("all"); // 'all' | 'items' | 'events' | 'polls'
  const [activityData, setActivityData] = useState({
    stats: { totalUploads: 0, itemsReported: 0, eventsHosted: 0, pollsCreated: 0, pollsVoted: 0 },
    myUploads: { items: [], events: [], polls: [] },
    myReactions: { votedPolls: [], rsvpedEvents: [] },
  });
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Profile Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [newAvatarUri, setNewAvatarUri] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");
  const avatarFullUrl = user?.avatarUrl ? `${imageHostUrl}${user.avatarUrl}` : null;
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "S";

  // Fetch Student Activity History
  const fetchActivity = useCallback(async () => {
    try {
      setIsLoadingActivity(true);
      const data = await api.get("/auth/activity");
      if (data && data.success) {
        setActivityData(data);
      }
    } catch (error) {
      console.log("Error fetching user activity:", error.message);
    } finally {
      setIsLoadingActivity(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchActivity();
  };

  // Pick / Change Avatar Photo
  const handlePickAvatar = () => {
    Alert.alert(
      "Update Profile Photo",
      "Choose an option to update your picture:",
      [
        {
          text: "Take Photo (Camera)",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission Required", "Camera access is needed.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets[0]?.uri) {
              setNewAvatarUri(result.assets[0].uri);
              if (!isEditModalOpen) {
                // If not in modal, save immediately
                handleDirectAvatarSave(result.assets[0].uri);
              }
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets[0]?.uri) {
              setNewAvatarUri(result.assets[0].uri);
              if (!isEditModalOpen) {
                handleDirectAvatarSave(result.assets[0].uri);
              }
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Direct Avatar Save from Profile Screen
  const handleDirectAvatarSave = async (uri) => {
    try {
      setIsSavingProfile(true);
      await updateUserProfile({ avatarUri: uri });
      Alert.alert("Profile Updated! 🎉", "Your profile photo has been updated.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile picture.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditName(user?.name || "");
    setEditPhone(user?.phone || "");
    setNewAvatarUri(null);
    setIsEditModalOpen(true);
  };

  // Save Edit Profile Modal
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Required Field", "Please enter your name.");
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateUserProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        avatarUri: newAvatarUri,
      });
      setIsEditModalOpen(false);
      Alert.alert("Success! ✨", "Your profile details have been saved.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your CampusConnect account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const stats = activityData.stats || {};
  const myItems = activityData.myUploads?.items || [];
  const myEvents = activityData.myUploads?.events || [];
  const myPolls = activityData.myUploads?.polls || [];
  const votedPolls = activityData.myReactions?.votedPolls || [];

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top App Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Student Profile</Text>
        <TouchableOpacity
          style={[styles.editHeaderButton, { backgroundColor: colors.primaryLight }]}
          onPress={handleOpenEditModal}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={[styles.editHeaderText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ─── PROFILE HERO CARD ─── */}
        <View style={[styles.profileHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Avatar with Edit Camera Icon */}
          <TouchableOpacity
            style={[styles.avatarWrapper, { borderColor: colors.primary }]}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
          >
            {avatarFullUrl ? (
              <Image source={{ uri: avatarFullUrl }} style={styles.avatarPhoto} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            )}
            <View style={[styles.cameraIconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || "Student"}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          {user?.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{user.phone}</Text>
            </View>
          ) : null}

          {/* Student Status Badge */}
          <View style={[styles.verifiedBadge, { backgroundColor: colors.foundBg }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.foundText} />
            <Text style={[styles.verifiedText, { color: colors.foundText }]}>
              {user?.isVerified ? "Verified Student ID" : "Student Member"}
            </Text>
          </View>
        </View>

        {/* ─── STATS COUNTER METRICS ─── */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.itemsReported || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lost & Found</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: "#F59E0B" }]}>{stats.eventsHosted || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Events</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: "#10B981" }]}>{stats.pollsCreated || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Polls Made</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: "#8B5CF6" }]}>{stats.pollsVoted || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Votes Cast</Text>
          </View>
        </View>

        {/* ─── ACTIVITY & HISTORY SECTION ─── */}
        <View style={styles.activitySectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activity & History</Text>
        </View>

        {/* Segmented Switcher */}
        <View style={[styles.segmentedTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "uploads" && [styles.activeTabButton, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab("uploads")}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={15}
              color={activeTab === "uploads" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "uploads" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              My Uploads ({stats.totalUploads || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "activity" && [styles.activeTabButton, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab("activity")}
          >
            <Ionicons
              name="flash-outline"
              size={15}
              color={activeTab === "activity" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "activity" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              My Votes ({stats.pollsVoted || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: MY UPLOADS */}
        {activeTab === "uploads" && (
          <View style={styles.historyList}>
            {/* Filter Pills */}
            <View style={styles.filterPillRow}>
              {["all", "items", "events", "polls"].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    { borderColor: uploadFilter === f ? colors.primary : colors.border },
                    uploadFilter === f && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setUploadFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: uploadFilter === f ? colors.primary : colors.textSecondary },
                      uploadFilter === f && { fontWeight: "700" },
                    ]}
                  >
                    {f === "all" ? "All" : f === "items" ? "Items" : f === "events" ? "Events" : "Polls"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isLoadingActivity ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null}

            {/* Empty State */}
            {!isLoadingActivity &&
            ((uploadFilter === "all" && myItems.length === 0 && myEvents.length === 0 && myPolls.length === 0) ||
              (uploadFilter === "items" && myItems.length === 0) ||
              (uploadFilter === "events" && myEvents.length === 0) ||
              (uploadFilter === "polls" && myPolls.length === 0)) ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Uploads Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Your reported lost/found items, campus events, and polls will appear here.
                </Text>
              </View>
            ) : null}

            {/* Items List */}
            {(uploadFilter === "all" || uploadFilter === "items") &&
              myItems.map((item) => (
                <View key={item._id} style={[styles.activityItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.type === "lost" ? colors.lostBg : colors.foundBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: item.type === "lost" ? colors.lostText : colors.foundText,
                          },
                        ]}
                      >
                        {item.type === "lost" ? "🔴 Lost Item" : "🟢 Found Item"}
                      </Text>
                    </View>
                    <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {item.locationName || "Campus"}
                    </Text>
                  </View>
                </View>
              ))}

            {/* Events List */}
            {(uploadFilter === "all" || uploadFilter === "events") &&
              myEvents.map((event) => (
                <View key={event._id} style={[styles.activityItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[styles.badgeText, { color: "#D97706" }]}>📅 Campus Event</Text>
                    </View>
                    <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                      {new Date(event.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{event.title}</Text>
                  <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {event.description}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {event.venue} • {event.time}
                    </Text>
                  </View>
                </View>
              ))}

            {/* Polls List */}
            {(uploadFilter === "all" || uploadFilter === "polls") &&
              myPolls.map((poll) => (
                <View key={poll._id} style={[styles.activityItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>📊 Campus Poll</Text>
                    </View>
                    <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                      {poll.totalVotes || 0} Total Votes
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{poll.question}</Text>
                  <View style={styles.pollOptionsPreview}>
                    {poll.options?.map((opt, i) => (
                      <Text key={i} style={[styles.pollOptionBullet, { color: colors.textSecondary }]}>
                        • {opt.text} ({opt.votes?.length || 0} votes)
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* TAB 2: MY VOTES & REACTIONS */}
        {activeTab === "activity" && (
          <View style={styles.historyList}>
            {isLoadingActivity ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null}

            {!isLoadingActivity && votedPolls.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkbox-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Votes Cast Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  When you participate in Campus Polls, your voting history and live results will appear here.
                </Text>
              </View>
            ) : null}

            {votedPolls.map((poll) => (
              <View key={poll._id} style={[styles.activityItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badge, { backgroundColor: "#EDE9FE" }]}>
                    <Text style={[styles.badgeText, { color: "#7C3AED" }]}>🗳️ Voted Poll</Text>
                  </View>
                  <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                    {poll.totalVotes || 0} total votes
                  </Text>
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{poll.question}</Text>
                <View style={styles.pollOptionsPreview}>
                  {poll.options?.map((opt, i) => {
                    const didVoteThis = opt.votes?.some((v) => (v._id || v) === (user?._id || user?.id));
                    return (
                      <View key={i} style={[styles.votedOptionRow, didVoteThis && { backgroundColor: colors.primaryLight }]}>
                        <Ionicons
                          name={didVoteThis ? "checkmark-circle" : "ellipse-outline"}
                          size={14}
                          color={didVoteThis ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.votedOptionText,
                            { color: didVoteThis ? colors.primary : colors.textSecondary },
                            didVoteThis && { fontWeight: "700" },
                          ]}
                        >
                          {opt.text}
                        </Text>
                        <Text style={[styles.votedOptionCount, { color: colors.textMuted }]}>
                          {opt.votes?.length || 0}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── APP PREFERENCES (THEME) ─── */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>Preferences</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelGroup}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {isDark ? "Dark Theme (Deep Navy)" : "Light Theme"}
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  {isDark ? "High contrast dark palette" : "Clean light interface"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── LOGOUT BUTTON ─── */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.errorBg, borderColor: colors.error }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Log Out of CampusConnect</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── EDIT PROFILE MODAL ─── */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Avatar Change */}
            <TouchableOpacity style={styles.modalAvatarPicker} onPress={handlePickAvatar}>
              {newAvatarUri ? (
                <Image source={{ uri: newAvatarUri }} style={styles.modalAvatarImg} />
              ) : avatarFullUrl ? (
                <Image source={{ uri: avatarFullUrl }} style={styles.modalAvatarImg} />
              ) : (
                <View style={[styles.modalAvatarCircle, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{userInitial}</Text>
                </View>
              )}
              <View style={[styles.modalCameraBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.modalAvatarHint, { color: colors.textSecondary }]}>Tap to change photo</Text>

            {/* Name Input */}
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: colors.textPrimary }]}>Full Name</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Phone Input */}
            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: colors.textPrimary }]}>Phone Number</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  editHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  editHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  profileHeroCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatarPhoto: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  phoneText: {
    fontSize: 13,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  activitySectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 2,
  },
  segmentedTabs: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  activeTabButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  historyList: {
    marginBottom: 16,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  activityItemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timeAgo: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  pollOptionsPreview: {
    marginTop: 6,
    gap: 4,
  },
  pollOptionBullet: {
    fontSize: 12,
  },
  votedOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  votedOptionText: {
    flex: 1,
    fontSize: 12,
  },
  votedOptionCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  settingsCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalAvatarPicker: {
    alignSelf: "center",
    position: "relative",
    marginBottom: 6,
  },
  modalAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  modalAvatarHint: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalTextInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  modalSaveButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  modalSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
