import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { api } from "../../lib/api";
import { triggerSystemNotification } from "../../lib/notifications";
import { COLORS } from "../../lib/config";

const CATEGORIES = [
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
 * Report Item Screen (Lost & Found)
 * 
 * WHAT IT DOES:
 * Allows students to report a lost or found item with photos, categories,
 * and GPS / reverse-geocoded location data.
 * 
 * HOW FORMDATA / MULTIPART UPLOADS WORK:
 * In React Native, uploading binary images requires `FormData`:
 * 1. Text fields are appended normally: `formData.append("title", title)`
 * 2. The photo is appended as an object with `{ uri, name, type }`:
 *    `formData.append("image", { uri: imageUri, name: "item.jpg", type: "image/jpeg" })`
 * 3. Never set `Content-Type: multipart/form-data` manually in headers!
 *    `fetch` automatically calculates the dynamic multipart boundary string.
 */
export default function ReportItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState("lost"); // 'lost' or 'found'
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [locationName, setLocationName] = useState("");
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [imageUri, setImageUri] = useState(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Camera Capture Handler
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take a photo of the item."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera Error:", error);
      Alert.alert("Error", "Could not open camera.");
    }
  };

  // 2. Photo Gallery Picker Handler
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select an image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Gallery Picker Error:", error);
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  // 3. GPS Location Tagging & Reverse Geocoding Handler
  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is needed to tag where the item was lost or found."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setCoordinates({ latitude, longitude });

      // Reverse geocode coordinates to get a readable address/place name
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const readableAddress = [
          place.name || place.street,
          place.district || place.subregion,
          place.city,
        ]
          .filter(Boolean)
          .join(", ");

        setLocationName(readableAddress || `Near coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
      }
    } catch (error) {
      console.error("Location Error:", error);
      Alert.alert("Location Error", "Could not fetch GPS coordinates. You can type the location manually.");
    } finally {
      setIsLocating(false);
    }
  };

  // 4. Form Submission Handler (Multipart/FormData)
  const handleSubmit = async () => {
    setErrorMessage("");

    if (!title.trim() || !description.trim() || !locationName.trim()) {
      setErrorMessage("Please fill in the title, description, and location.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Create Multipart/FormData payload
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("type", type);
      formData.append("category", category);
      formData.append("locationName", locationName.trim());

      if (coordinates.latitude !== null) {
        formData.append("latitude", String(coordinates.latitude));
      }
      if (coordinates.longitude !== null) {
        formData.append("longitude", String(coordinates.longitude));
      }

      // Attach file if selected (React Native { uri, name, type } shape)
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "item_photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";

        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
        });
      }

      // Send POST request with FormData
      const res = await api.post("/items", formData);

      // Trigger native phone system notification banner with sound
      triggerSystemNotification({
        title: type === "lost" ? `🔴 Lost Item: ${title.trim()}` : `🟢 Found Item: ${title.trim()}`,
        body: `Reported at ${locationName.trim() || "Campus"}. Broadcasted to students!`,
        data: { id: res?.item?._id, type },
      });

      Alert.alert(
        "Report Submitted! 🎉",
        type === "lost"
          ? "Your lost item report has been published to the campus feed."
          : "Thank you for reporting a found item to help your fellow student!",
        [
          {
            text: "View Feed",
            onPress: () => {
              // Reset form
              setTitle("");
              setDescription("");
              setLocationName("");
              setImageUri(null);
              router.push("/(tabs)/lost-found");
            },
          },
        ]
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Report an Item</Text>
            <Text style={styles.headerSubtitle}>
              Connect lost items with their rightful owners
            </Text>
          </View>

          {/* Type Toggle: Lost vs Found (Stitch UI Pills) */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                type === "lost" && styles.toggleButtonLostActive,
              ]}
              onPress={() => setType("lost")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="alert-circle"
                size={18}
                color={type === "lost" ? "#FFFFFF" : COLORS.lostText}
              />
              <Text
                style={[
                  styles.toggleText,
                  type === "lost" ? styles.toggleTextActive : { color: COLORS.lostText },
                ]}
              >
                I Lost Something
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                type === "found" && styles.toggleButtonFoundActive,
              ]}
              onPress={() => setType("found")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={type === "found" ? "#FFFFFF" : COLORS.foundText}
              />
              <Text
                style={[
                  styles.toggleText,
                  type === "found" ? styles.toggleTextActive : { color: COLORS.foundText },
                ]}
              >
                I Found Something
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.card}>
            {/* Photo Section */}
            <Text style={styles.sectionLabel}>Item Photo</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <View style={[styles.photoIconCircle, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.7}
                >
                  <View style={[styles.photoIconCircle, { backgroundColor: "#F1F5F9" }]}>
                    <Ionicons name="images" size={24} color={COLORS.textSecondary} />
                  </View>
                  <Text style={styles.photoActionText}>Choose Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Silver Milton Water Bottle, Blue AirPods Case"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillSelected,
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe details, color, stickers, brands, or where you last saw it..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Location Section with GPS Button */}
            <View style={styles.inputGroup}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.inputLabel}>Location *</Text>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleGetLocation}
                  disabled={isLocating}
                  activeOpacity={0.7}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={14} color={COLORS.primary} />
                      <Text style={styles.gpsButtonText}>Use GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Library 2nd Floor, Room 714 Lab, Cafeteria"
                placeholderTextColor={COLORS.textMuted}
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                type === "found" ? styles.submitButtonFound : styles.submitButtonLost,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.buttonRow}>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {type === "lost" ? "Publish Lost Report" : "Publish Found Report"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  toggleButtonLostActive: {
    backgroundColor: COLORS.lostText,
  },
  toggleButtonFoundActive: {
    backgroundColor: COLORS.foundText,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  photoActionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  photoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 190,
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  categoryPillTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  locationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  gpsButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonLost: {
    backgroundColor: COLORS.primary,
  },
  submitButtonFound: {
    backgroundColor: COLORS.foundText,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
