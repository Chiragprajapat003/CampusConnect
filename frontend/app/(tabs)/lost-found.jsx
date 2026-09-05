import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "../../lib/config";

const CATEGORIES = [
  "All",
  "Electronics",
  "Cards & Wallets",
  "Keys",
  "Clothing",
  "Books & Notes",
  "Bottles & Containers",
  "Accessories",
  "Other",
];

/**
 * Lost & Found Feed Screen (Stitch UI Design)
 * 
 * WHAT IT DOES:
 * Displays all active and resolved lost & found items on campus,
 * with search, type filters (Lost / Found / All), category pills,
 * pull-to-refresh, and direct Contact Reporter buttons (Call / Email).
 */
export default function LostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all"); // 'all', 'lost', 'found'
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Base host URL for serving uploaded images
  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.append("type", selectedType);
      if (selectedCategory !== "All") params.append("category", selectedCategory);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const data = await api.get(`/items${queryString}`);
      setItems(data?.items || []);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedType, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchItems();
  };

  // Contact Reporter Action
  const handleContact = (item) => {
    const reporter = item?.createdBy;
    if (!reporter) {
      Alert.alert("Notice", "Reporter contact details are not available.");
      return;
    }

    if (reporter.phone) {
      Alert.alert(
        `Contact ${reporter.name || "Reporter"}`,
        `Choose how you would like to connect with ${reporter.name || "the student"}:`,
        [
          {
            text: "Call Phone",
            onPress: () => Linking.openURL(`tel:${reporter.phone}`),
          },
          {
            text: "Send Email",
            onPress: () =>
              Linking.openURL(
                `mailto:${reporter.email}?subject=Regarding your CampusConnect report: ${item.title || ""}`
              ),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else if (reporter.email) {
      Linking.openURL(
        `mailto:${reporter.email}?subject=Regarding your CampusConnect report: ${item.title || ""}`
      );
    } else {
      Alert.alert("Notice", "No phone or email listed for this reporter.");
    }
  };

  const renderItemCard = ({ item }) => {
    if (!item) return null;

    const isLost = item.type === "lost";
    const isResolved = item.status === "resolved";
    const imageUrl = item.imageUrl ? `${imageHostUrl}${item.imageUrl}` : null;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/item/${item._id}`)}
        activeOpacity={0.88}
      >
        {/* Card Header: Type Badge & Status */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeGroup}>
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
                {isLost ? "LOST" : "FOUND"}
              </Text>
            </View>

            <View style={[styles.categoryTag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.categoryTagText, { color: colors.primary }]}>
                {item.category || "Item"}
              </Text>
            </View>
          </View>

          {isResolved && (
            <View style={[styles.resolvedBadge, { backgroundColor: colors.resolvedBg }]}>
              <Ionicons name="checkmark-done" size={14} color={colors.resolvedText} />
              <Text style={[styles.resolvedText, { color: colors.resolvedText }]}>Resolved</Text>
            </View>
          )}
        </View>

        {/* Image & Main Info Layout */}
        <View style={styles.cardBody}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons
                name={isLost ? "search-outline" : "gift-outline"}
                size={32}
                color={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.itemDetails}>
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title || "Untitled Report"}
            </Text>
            <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description || "No description provided."}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.location?.name || "Campus Location"}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Footer: Reporter & Contact Button */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.reporterInfo}>
            <Text style={[styles.reporterLabel, { color: colors.textMuted }]}>Posted by</Text>
            <Text style={[styles.reporterName, { color: colors.textPrimary }]}>
              {item.createdBy?.name || "Student"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.primaryLight }]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleContact(item);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <Text style={[styles.contactButtonText, { color: colors.primary }]}>Contact</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header & Search */}
      <View style={[styles.topContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Lost & Found</Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search items, keywords, locations..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Filter Buttons (All, Lost, Found) */}
        <View style={styles.typeFilterRow}>
          {[
            { key: "all", label: "All Items" },
            { key: "lost", label: "Lost Items" },
            { key: "found", label: "Found Items" },
          ].map((tab) => {
            const isSelected = selectedType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.typeFilterButton,
                  { backgroundColor: isSelected ? colors.primary : colors.background, borderColor: colors.border },
                ]}
                onPress={() => setSelectedType(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeFilterText,
                    { color: isSelected ? "#FFFFFF" : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading campus feed...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Items Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No lost or found reports match your current filters.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  typeFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  typeFilterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  typeFilterText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reporterInfo: {
    flex: 1,
  },
  reporterLabel: {
    fontSize: 11,
  },
  reporterName: {
    fontSize: 13,
    fontWeight: "600",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
