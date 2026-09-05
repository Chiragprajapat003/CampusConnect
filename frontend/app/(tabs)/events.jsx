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
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationModal from "../../components/NotificationModal";
import { triggerSystemNotification } from "../../lib/notifications";
import { API_BASE_URL } from "../../lib/config";

const EVENT_CATEGORIES = [
  "All",
  "Workshop",
  "Tech Talk",
  "Hackathon",
  "Social",
  "Sports",
  "Cultural",
  "Career",
];

const POLL_CATEGORIES = [
  "All",
  "Campus Life",
  "Events & Fest",
  "Academics",
  "Food & Mess",
  "Sports",
  "General",
];

/**
 * Campus Events & Polls Board Screen (Stitch UI Design)
 * 
 * WHAT IT DOES:
 * - View & search campus events with live optimistic RSVP.
 * - View & vote on campus opinion polls with real-time percentage bars.
 * - Create and upload new events with banner photos.
 * - Create new campus opinion polls with custom voting options.
 */
export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { hasUnread } = useNotifications();

  // Active view mode: 'events' or 'polls'
  const [activeTab, setActiveTab] = useState("events");

  // Data states
  const [events, setEvents] = useState([]);
  const [polls, setPolls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Creation & Alert Modals
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventOrganizer, setEventOrganizer] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventTime, setEventTime] = useState("5:00 PM - 7:00 PM");
  const [eventCategory, setEventCategory] = useState("Workshop");
  const [eventImageUri, setEventImageUri] = useState(null);

  // New Poll Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollCategory, setPollCategory] = useState("Campus Life");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");

  // 1. Fetch Events & Polls
  const fetchData = useCallback(async () => {
    try {
      if (activeTab === "events") {
        const params = new URLSearchParams();
        if (selectedCategory !== "All") params.append("category", selectedCategory);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        const query = params.toString() ? `?${params.toString()}` : "";
        const data = await api.get(`/events${query}`);
        setEvents(data?.events || []);
      } else {
        const data = await api.get("/polls");
        setPolls(data?.polls || []);
      }
    } catch (error) {
      console.error("Fetch Data Error:", error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // 2. RSVP Handler
  const handleToggleRSVP = async (eventItem) => {
    const isCurrentlyAttending = eventItem.rsvps?.some(
      (id) => id === user?._id || id?._id === user?._id
    );

    // Optimistic Update
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev._id === eventItem._id) {
          const newRsvps = isCurrentlyAttending
            ? (ev.rsvps || []).filter((id) => id !== user?._id && id?._id !== user?._id)
            : [...(ev.rsvps || []), user?._id];
          return { ...ev, rsvps: newRsvps };
        }
        return ev;
      })
    );

    try {
      await api.post(`/events/${eventItem._id}/rsvp`);
    } catch (error) {
      console.error("RSVP Error:", error);
      Alert.alert("Error", "Could not update RSVP.");
      fetchData();
    }
  };

  // 3. Vote Poll Handler
  const handleVotePoll = async (pollId, optionIndex) => {
    // Optimistic update
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll._id === pollId) {
          const updatedOptions = poll.options.map((opt, idx) => {
            const alreadyVotedThis = opt.votes?.some(
              (id) => id === user?._id || id?._id === user?._id
            );
            // Remove user vote from all options
            let filteredVotes = (opt.votes || []).filter(
              (id) => id !== user?._id && id?._id !== user?._id
            );
            // If clicking target option and wasn't voted before, add user
            if (idx === optionIndex && !alreadyVotedThis) {
              filteredVotes.push(user?._id);
            }
            return { ...opt, votes: filteredVotes };
          });
          return { ...poll, options: updatedOptions };
        }
        return poll;
      })
    );

    try {
      await api.post(`/polls/${pollId}/vote`, { optionIndex });
    } catch (error) {
      console.error("Vote Error:", error);
      Alert.alert("Error", "Could not submit vote.");
      fetchData();
    }
  };

  // 4. Image Picker for Event Banner
  const handlePickEventImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEventImageUri(result.assets[0].uri);
    }
  };

  // 5. Submit Event Form
  const handleSubmitEvent = async () => {
    if (!eventTitle.trim() || !eventDescription.trim() || !eventOrganizer.trim() || !eventVenue.trim()) {
      Alert.alert("Missing Details", "Please fill in all event fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", eventTitle.trim());
      formData.append("description", eventDescription.trim());
      formData.append("organizer", eventOrganizer.trim());
      formData.append("venue", eventVenue.trim());
      formData.append("date", eventDate);
      formData.append("time", eventTime.trim());
      formData.append("category", eventCategory);

      if (eventImageUri) {
        const filename = eventImageUri.split("/").pop() || "event.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("image", { uri: eventImageUri, name: filename, type });
      }

      await api.post("/events", formData);

      // Trigger native phone system notification banner with sound
      triggerSystemNotification({
        title: `🎉 Event Announced: ${eventTitle.trim()}`,
        body: `${eventOrganizer.trim()} at ${eventVenue.trim()} (${eventTime.trim()})`,
        data: { type: "event" },
      });

      Alert.alert("Success! 🎉", "Your campus event has been announced.");
      setIsCreateEventModalOpen(false);
      setEventTitle("");
      setEventDescription("");
      setEventOrganizer("");
      setEventVenue("");
      setEventImageUri(null);
      fetchData();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Submit Poll Form
  const handleSubmitPoll = async () => {
    if (!pollQuestion.trim()) {
      Alert.alert("Missing Question", "Please enter a poll question.");
      return;
    }
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      Alert.alert("Options Needed", "Please provide at least 2 options for voting.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/polls", {
        question: pollQuestion.trim(),
        category: pollCategory,
        options: cleanOptions,
      });

      // Trigger native phone system notification banner with sound
      triggerSystemNotification({
        title: "📊 Campus Poll Launched!",
        body: `${pollQuestion.trim()} — Cast your vote on the campus board!`,
        data: { type: "poll" },
      });

      Alert.alert("Poll Created! 📊", "Your poll is now live for campus voting.");
      setIsCreatePollModalOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setActiveTab("polls");
      fetchData();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to create poll.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll Option Helpers
  const handleOptionChange = (text, index) => {
    const updated = [...pollOptions];
    updated[index] = text;
    setPollOptions(updated);
  };
  const handleAddOption = () => {
    if (pollOptions.length < 5) setPollOptions([...pollOptions, ""]);
  };
  const handleRemoveOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Render Event Card
  const renderEventCard = ({ item }) => {
    const isAttending = item.rsvps?.some(
      (id) => id === user?._id || id?._id === user?._id
    );
    const attendeeCount = item.rsvps?.length || 0;
    const imageUrl = item.imageUrl ? `${imageHostUrl}${item.imageUrl}` : null;
    const eventDateFormatted = new Date(item.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      weekday: "short",
    });

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="calendar" size={36} color={colors.primary} />
            <Text style={[styles.placeholderOrganizer, { color: colors.primary }]}>{item.organizer}</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.tagRow}>
            <View style={[styles.categoryPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.categoryPillText, { color: colors.primary }]}>{item.category || "Event"}</Text>
            </View>
            <View style={styles.dateTag}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.dateTagText, { color: colors.textSecondary }]}>
                {eventDateFormatted} • {item.time}
              </Text>
            </View>
          </View>

          <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{item.title}</Text>
          <View style={styles.organizerRow}>
            <Ionicons name="people-outline" size={15} color={colors.primary} />
            <Text style={[styles.organizerText, { color: colors.primary }]}>Hosted by {item.organizer}</Text>
          </View>

          <View style={styles.venueRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.venueText, { color: colors.textSecondary }]} numberOfLines={1}>{item.venue}</Text>
          </View>

          <Text style={[styles.descriptionText, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={styles.attendeeCounter}>
              <Ionicons name="ticket-outline" size={16} color={colors.primary} />
              <Text style={[styles.attendeeCountText, { color: colors.textPrimary }]}>
                {attendeeCount} Student{attendeeCount === 1 ? "" : "s"} Going
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.rsvpButton,
                isAttending
                  ? { backgroundColor: colors.foundText }
                  : { backgroundColor: colors.primary },
              ]}
              onPress={() => handleToggleRSVP(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isAttending ? "checkmark-circle" : "add-circle-outline"}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.rsvpButtonText}>
                {isAttending ? "Attending ✓" : "RSVP Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render Poll Card
  const renderPollCard = ({ item: poll }) => {
    const totalVotes = (poll.options || []).reduce(
      (sum, opt) => sum + (opt.votes ? opt.votes.length : 0),
      0
    );

    return (
      <View style={[styles.pollCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pollHeaderRow}>
          <View style={[styles.pollCategoryBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.pollCategoryText, { color: colors.primary }]}>{poll.category || "General"}</Text>
          </View>
          <Text style={[styles.pollVotesCount, { color: colors.textSecondary }]}>
            🗳️ {totalVotes} Vote{totalVotes === 1 ? "" : "s"}
          </Text>
        </View>

        <Text style={[styles.pollQuestion, { color: colors.textPrimary }]}>{poll.question}</Text>
        <Text style={[styles.pollCreatorText, { color: colors.textMuted }]}>
          Asked by {poll.createdBy?.name || "Student"}
        </Text>

        <View style={styles.optionsContainer}>
          {poll.options.map((option, index) => {
            const optionVotes = option.votes ? option.votes.length : 0;
            const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
            const isUserVoted = option.votes?.some(
              (id) => id === user?._id || id?._id === user?._id
            );

            return (
              <TouchableOpacity
                key={`opt-${index}`}
                style={[
                  styles.optionRow,
                  { backgroundColor: colors.background, borderColor: isUserVoted ? colors.primary : colors.border },
                ]}
                onPress={() => handleVotePoll(poll._id, index)}
                activeOpacity={0.85}
              >
                {/* Visual Progress Bar Fill */}
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: isUserVoted ? colors.primaryLight : (colors.border + "88"),
                    },
                  ]}
                />

                <View style={styles.optionContent}>
                  <View style={styles.optionTextRow}>
                    <Ionicons
                      name={isUserVoted ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isUserVoted ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.textPrimary, fontWeight: isUserVoted ? "700" : "500" },
                      ]}
                    >
                      {option.text}
                    </Text>
                  </View>
                  <Text style={[styles.percentageText, { color: isUserVoted ? colors.primary : colors.textSecondary }]}>
                    {percentage}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const categoriesToDisplay = activeTab === "events" ? EVENT_CATEGORIES : POLL_CATEGORIES;

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Header & Segment Switch */}
      <View style={[styles.topContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Campus Board</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TouchableOpacity
              style={[styles.notifButton, { backgroundColor: colors.primaryLight }]}
              onPress={() => setIsNotifOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              {hasUnread && <View style={[styles.badgeDot, { backgroundColor: colors.error }]} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsActionModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        <NotificationModal visible={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

        {/* Tab Switcher: Events vs Polls */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === "events" && [styles.segmentTabActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              setActiveTab("events");
              setSelectedCategory("All");
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={activeTab === "events" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentTabText,
                { color: activeTab === "events" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === "polls" && [styles.segmentTabActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => {
              setActiveTab("polls");
              setSelectedCategory("All");
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="stats-chart"
              size={16}
              color={activeTab === "polls" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentTabText,
                { color: activeTab === "polls" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              Campus Polls
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar (Events tab only) */}
        {activeTab === "events" && (
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search events, clubs, venues..."
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
        )}

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categoriesToDisplay.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterPillText,
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

      {/* Main Feed Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading {activeTab}...</Text>
        </View>
      ) : activeTab === "events" ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderEventCard}
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
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Events Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Be the first to announce an event on campus!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(item) => item._id}
          renderItem={renderPollCard}
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
                <Ionicons name="stats-chart-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Polls Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create a poll to gather student opinions on campus topics!
              </Text>
            </View>
          }
        />
      )}

      {/* ─── ACTION SHEET MODAL ─── */}
      <Modal visible={isActionModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsActionModalOpen(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.actionSheetTitle, { color: colors.textPrimary }]}>Create on CampusConnect</Text>

            <TouchableOpacity
              style={[styles.sheetOption, { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setIsActionModalOpen(false);
                setIsCreateEventModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>Host an Event</Text>
                <Text style={[styles.sheetOptionSubtitle, { color: colors.textSecondary }]}>
                  Workshops, club meetings, hackathons & fest
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOption, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => {
                setIsActionModalOpen(false);
                setIsCreatePollModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: "#10B981" }]}>
                <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>Create a Campus Poll</Text>
                <Text style={[styles.sheetOptionSubtitle, { color: colors.textSecondary }]}>
                  Ask questions & get real-time student votes
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── CREATE EVENT MODAL ─── */}
      <Modal visible={isCreateEventModalOpen} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsCreateEventModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Announce Event</Text>
            <TouchableOpacity onPress={handleSubmitEvent} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.publishText, { color: colors.primary }]}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formScroll}>
            {/* Banner Picker */}
            <TouchableOpacity
              style={[styles.imagePickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handlePickEventImage}
              activeOpacity={0.8}
            >
              {eventImageUri ? (
                <Image source={{ uri: eventImageUri }} style={styles.pickedImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={36} color={colors.primary} />
                  <Text style={[styles.imagePickerText, { color: colors.primary }]}>Upload Banner Image (Optional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Event Title</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. AI & Robotics Hands-on Workshop"
              placeholderTextColor={colors.textMuted}
              value={eventTitle}
              onChangeText={setEventTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Host / Club Name</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. ACM Student Chapter"
              placeholderTextColor={colors.textMuted}
              value={eventOrganizer}
              onChangeText={setEventOrganizer}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Venue / Room</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Auditorium Hall B"
              placeholderTextColor={colors.textMuted}
              value={eventVenue}
              onChangeText={setEventVenue}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Time</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. 5:00 PM - 7:30 PM"
              placeholderTextColor={colors.textMuted}
              value={eventTime}
              onChangeText={setEventTime}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Describe event agenda, speakers, and requirements..."
              placeholderTextColor={colors.textMuted}
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── CREATE POLL MODAL ─── */}
      <Modal visible={isCreatePollModalOpen} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalScreen, { backgroundColor: colors.background, paddingTop: insets.top }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsCreatePollModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Create Campus Poll</Text>
            <TouchableOpacity onPress={handleSubmitPoll} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.publishText, { color: colors.primary }]}>Launch</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formScroll}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poll Question</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Should the campus library stay open 24/7 during finals week?"
              placeholderTextColor={colors.textMuted}
              value={pollQuestion}
              onChangeText={setPollQuestion}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>Voting Options</Text>
            {pollOptions.map((opt, index) => (
              <View key={`input-opt-${index}`} style={styles.pollOptionInputRow}>
                <TextInput
                  style={[styles.formInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={opt}
                  onChangeText={(t) => handleOptionChange(t, index)}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeOptionBtn}
                    onPress={() => handleRemoveOption(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 5 && (
              <TouchableOpacity
                style={[styles.addOptionBtn, { borderColor: colors.primary }]}
                onPress={handleAddOption}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Option</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  notifButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentTabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: "700",
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
  categoryScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bannerImage: {
    width: "100%",
    height: 150,
  },
  bannerPlaceholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  placeholderOrganizer: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardContent: {
    padding: 16,
  },
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  organizerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  venueText: {
    fontSize: 13,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  attendeeCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attendeeCountText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rsvpButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  rsvpButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pollCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pollHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pollCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pollCategoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pollVotesCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  pollQuestion: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
    lineHeight: 22,
  },
  pollCreatorText: {
    fontSize: 12,
    marginBottom: 14,
  },
  optionsContainer: {
    gap: 10,
  },
  optionRow: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  progressBarFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  sheetOptionSubtitle: {
    fontSize: 12,
  },
  modalScreen: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  publishText: {
    fontSize: 15,
    fontWeight: "700",
  },
  formScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  imagePickerBox: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imagePickerPlaceholder: {
    alignItems: "center",
    gap: 8,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickedImage: {
    width: "100%",
    height: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pollOptionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeOptionBtn: {
    padding: 8,
    marginBottom: 8,
  },
  addOptionBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 6,
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
