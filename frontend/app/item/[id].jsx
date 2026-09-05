import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "../../lib/config";

/**
 * Item Detail Screen with Smart Match Suggestions
 * 
 * WHAT IT DOES:
 * - Displays complete information for a single Lost or Found report.
 * - If the current logged-in student is the owner, enables "Mark as Resolved" and "Delete".
 * - If the student is not the owner, provides direct "Call" / "Email" contact options.
 * - Smart Match: Runs keyword & category matching to surface potential opposite items.
 */
export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Base host for static images
  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");

  // 1. Fetch Item Details & Smart Matches
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get(`/items/${id}`);
      setItem(data?.item || null);

      // Fetch smart suggestions
      try {
        const matchData = await api.get(`/items/${id}/matches`);
        setMatches(matchData?.matches || []);
      } catch (matchErr) {
        console.log("No smart matches:", matchErr.message);
      }
    } catch (error) {
      console.error("Error fetching item detail:", error.message);
      Alert.alert("Error", error.message || "Failed to load item details.", [
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  // 2. Mark as Resolved / Reopen
  const handleToggleResolve = async () => {
    try {
      setIsResolving(true);
      const res = await api.patch(`/items/${id}/resolve`);
      setItem((prev) => ({ ...prev, status: res.status }));
      Alert.alert(
        "Status Updated",
        res.status === "resolved"
          ? "Item marked as resolved! 🎉"
          : "Item report reopened as active."
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not update status.");
    } finally {
      setIsResolving(false);
    }
  };

  // 3. Delete Report (Owner only with confirmation)
  const handleDelete = () => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to permanently delete this report? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await api.delete(`/items/${id}`);
              Alert.alert("Deleted", "Your report has been removed.", [
                { text: "OK", onPress: () => router.replace("/(tabs)/lost-found") },
              ]);
            } catch (error) {
              Alert.alert("Error", error.message || "Could not delete report.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // 4. Contact Action
  const handleContact = () => {
    const reporter = item?.createdBy;
    if (!reporter) return;

    if (reporter.phone) {
      Alert.alert(
        `Contact ${reporter.name || "Reporter"}`,
        `How would you like to connect with ${reporter.name || "the student"}?`,
        [
          { text: "Call Phone", onPress: () => Linking.openURL(`tel:${reporter.phone}`) },
          {
            text: "Send Email",
            onPress: () =>
              Linking.openURL(
                `mailto:${reporter.email}?subject=Regarding your CampusConnect post: ${item.title || ""}`
              ),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else if (reporter.email) {
      Linking.openURL(
        `mailto:${reporter.email}?subject=Regarding your CampusConnect post: ${item.title || ""}`
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) return null;

  const isOwner = user && item.createdBy && (user._id === item.createdBy._id || user._id === item.createdBy);
  const isLost = item.type === "lost";
  const isResolved = item.status === "resolved";
  const imageUrl = item.imageUrl ? `${imageHostUrl}${item.imageUrl}` : null;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Item Details</Text>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.deleteIconButton, { backgroundColor: colors.errorBg }]}
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Photo Banner */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons
              name={isLost ? "search-outline" : "gift-outline"}
              size={64}
              color={colors.textMuted}
            />
          </View>
        )}

        {/* Badges & Status Row */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              isLost
                ? { backgroundColor: colors.lostBg }
                : { backgroundColor: colors.foundBg },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isLost
                  ? { color: colors.lostText }
                  : { color: colors.foundText },
              ]}
            >
              {isLost ? "LOST ITEM" : "FOUND ITEM"}
            </Text>
          </View>

          <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>{item.category || "Item"}</Text>
          </View>

          {isResolved && (
            <View style={[styles.resolvedBadge, { backgroundColor: colors.resolvedBg }]}>
              <Ionicons name="checkmark-done" size={14} color={colors.resolvedText} />
              <Text style={[styles.resolvedBadgeText, { color: colors.resolvedText }]}>Resolved</Text>
            </View>
          )}
        </View>

        {/* Title & Date */}
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          Reported on {new Date(item.date || item.createdAt).toLocaleDateString()}
        </Text>

        {/* Description Section */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{item.description}</Text>
        </View>

        {/* Location Section */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Location Tagged</Text>
          <View style={styles.locationRow}>
            <View style={[styles.locationIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationName, { color: colors.textPrimary }]}>{item.location?.name || "Campus"}</Text>
              {item.location?.latitude && (
                <Text style={[styles.coordinatesText, { color: colors.textMuted }]}>
                  GPS: {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Reporter Profile Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Posted By</Text>
          <View style={styles.reporterRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.createdBy?.name ? item.createdBy.name.charAt(0).toUpperCase() : "S"}
              </Text>
            </View>
            <View style={styles.reporterDetails}>
              <Text style={[styles.reporterName, { color: colors.textPrimary }]}>{item.createdBy?.name || "Student"}</Text>
              <Text style={[styles.reporterEmail, { color: colors.textSecondary }]}>{item.createdBy?.email}</Text>
              <View style={[styles.studentBadge, { backgroundColor: colors.foundBg }]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.foundText} />
                <Text style={[styles.studentBadgeText, { color: colors.foundText }]}>Verified Student</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 🧠 Smart Match Suggestions Card */}
        {matches.length > 0 && (
          <View style={styles.smartMatchContainer}>
            <View style={styles.smartMatchHeader}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
              <Text style={styles.smartMatchTitle}>Possible Match Suggestions</Text>
            </View>
            <Text style={styles.smartMatchSubtitle}>
              We found {matches.length} matching {isLost ? "found" : "lost"} item{matches.length > 1 ? "s" : ""} on campus based on keywords & category:
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matchScroll}>
              {matches.map(({ item: matchItem, matchReasons }) => (
                <TouchableOpacity
                  key={matchItem._id}
                  style={styles.matchCard}
                  onPress={() => router.push(`/item/${matchItem._id}`)}
                  activeOpacity={0.8}
                >
                  {matchItem.imageUrl ? (
                    <Image
                      source={{ uri: `${imageHostUrl}${matchItem.imageUrl}` }}
                      style={styles.matchImage}
                    />
                  ) : (
                    <View style={styles.matchPlaceholder}>
                      <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.matchInfo}>
                    <Text style={[styles.matchItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {matchItem.title}
                    </Text>
                    <Text style={[styles.matchLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                      📍 {matchItem.location?.name || "Campus"}
                    </Text>
                    {matchReasons?.[0] && (
                      <Text style={[styles.matchReasonTag, { color: colors.primary }]} numberOfLines={1}>
                        ✨ {matchReasons[0]}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isOwner ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isResolved ? { backgroundColor: colors.primary } : { backgroundColor: colors.foundText },
            ]}
            onPress={handleToggleResolve}
            disabled={isResolving}
            activeOpacity={0.85}
          >
            {isResolving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isResolved ? "refresh-outline" : "checkmark-circle-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {isResolved ? "Reopen as Active" : "Mark as Resolved"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleContact}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Contact {item.createdBy?.name || "Reporter"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  deleteIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  heroImage: {
    width: "100%",
    height: 240,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  resolvedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    marginBottom: 16,
  },
  infoCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600",
  },
  coordinatesText: {
    fontSize: 12,
    marginTop: 2,
  },
  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  reporterDetails: {
    flex: 1,
  },
  reporterName: {
    fontSize: 15,
    fontWeight: "700",
  },
  reporterEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  studentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  studentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  smartMatchContainer: {
    backgroundColor: "#FEF3C7",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  smartMatchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  smartMatchTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
  },
  smartMatchSubtitle: {
    fontSize: 12,
    color: "#B45309",
    marginBottom: 12,
  },
  matchScroll: {
    flexDirection: "row",
  },
  matchCard: {
    width: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  matchImage: {
    width: "100%",
    height: 90,
    borderRadius: 10,
    marginBottom: 8,
  },
  matchPlaceholder: {
    width: "100%",
    height: 90,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  matchInfo: {
    flex: 1,
  },
  matchItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  matchLocation: {
    fontSize: 11,
    marginBottom: 4,
  },
  matchReasonTag: {
    fontSize: 10,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
