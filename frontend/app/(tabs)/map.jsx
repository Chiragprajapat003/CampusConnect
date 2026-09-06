import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { api } from "../../lib/api";
import { API_BASE_URL, COLORS } from "../../lib/config";

// Exact Center coordinates of Swaminarayan University, Kalol provided by the user
const DEFAULT_REGION = {
  latitude: 23.2230998,
  longitude: 72.5054761,
  latitudeDelta: 0.005, // Much tighter zoom
  longitudeDelta: 0.005,
};

/**
 * Interactive Campus Map Screen (Stitch UI Design)
 * 
 * WHAT IT DOES:
 * Displays all active Lost & Found items and Campus Events as color-coded pins
 * on a live interactive map, with filter toggles and one-tap detail navigation.
 * 
 * COLOR CODING:
 * - 🔴 Coral Red: Lost Items
 * - 🟢 Emerald Green: Found Items
 * - 🟣 Indigo Violet: Campus Events
 */
export default function CampusMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState("all"); // 'all', 'lost', 'found', 'events'
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [is3DMode, setIs3DMode] = useState(false); // Track if map is in 3D perspective
  const [mapType, setMapType] = useState("standard"); // Toggle satellite/standard

  const imageHostUrl = API_BASE_URL.replace(/\/api$/, "");

  // 1. Fetch user GPS location
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setUserLocation(coords);

        // Calculate distance to campus to see if they are actually on/near campus
        const latDiff = Math.abs(coords.latitude - DEFAULT_REGION.latitude);
        const lonDiff = Math.abs(coords.longitude - DEFAULT_REGION.longitude);
        
        if (mapRef.current) {
          // If the user is very far away from the campus (e.g. testing from home), 
          // don't fly the camera away from the campus! Always show the campus by default.
          const isNearCampus = latDiff < 0.05 && lonDiff < 0.05;
          
          mapRef.current.animateCamera({
            center: isNearCampus ? coords : DEFAULT_REGION,
            pitch: is3DMode ? 65 : 0,
            heading: 0,
            altitude: is3DMode ? 400 : 1000, // Zoom in closer for the exact campus view
          }, { duration: 1000 });
        }
      }
    } catch (error) {
      console.log("GPS Location notice:", error.message);
    }
  }, []);

  // 2. Fetch all map markers (items + events)
  const fetchMapData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [itemsRes, eventsRes] = await Promise.all([
        api.get("/items").catch(() => ({ items: [] })),
        api.get("/events").catch(() => ({ events: [] })),
      ]);

      // Only include items with valid numeric coordinates
      const validItems = (itemsRes.items || []).filter(
        (i) =>
          i.location?.latitude &&
          i.location?.longitude &&
          !isNaN(i.location.latitude) &&
          !isNaN(i.location.longitude)
      );

      setItems(validItems);
      setEvents(eventsRes.events || []);
    } catch (error) {
      console.error("Error loading map data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getUserLocation();
    fetchMapData();
  }, [getUserLocation, fetchMapData]);

  // Recenter button action
  const handleRecenter = async () => {
    let target = userLocation || DEFAULT_REGION;
    if (!userLocation) {
       await getUserLocation();
       // getUserLocation updates the state and animates itself, so we can return early
       return; 
    }
    
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: target,
        pitch: is3DMode ? 65 : 0,
        heading: 0,
        altitude: is3DMode ? 800 : 2000,
      }, { duration: 800 });
    }
  };

  // Toggle 3D visual map
  const toggle3DMode = () => {
    const new3DState = !is3DMode;
    setIs3DMode(new3DState);
    if (mapRef.current) {
      mapRef.current.animateCamera({
        pitch: new3DState ? 65 : 0,
        altitude: new3DState ? 800 : 2000,
      }, { duration: 1200 });
    }
  };

  // Toggle Map Type (Satellite / Standard)
  const toggleMapType = () => {
    setMapType(prev => (prev === "standard" ? "satellite" : "standard"));
  };

  // Filter markers based on selected chip
  const displayedItems = items.filter((item) => {
    if (filterType === "all") return true;
    if (filterType === "lost") return item.type === "lost";
    if (filterType === "found") return item.type === "found";
    return false;
  });

  const displayedEvents = filterType === "all" || filterType === "events" ? events : [];

  return (
    <View style={styles.container}>
      {/* Interactive Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation || DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsBuildings={true} // ENABLES 3D BUILDINGS
        pitchEnabled={true}
        mapType={mapType} // Controlled by state
        minZoomLevel={15.5} // Prevents user from zooming out to the whole city!
      >
        {/* Render Lost & Found Pins */}
        {displayedItems.map((item) => {
          const isLost = item.type === "lost";
          const pinColor = isLost ? COLORS.lostText : COLORS.foundText;
          const imageUrl = item.imageUrl ? `${imageHostUrl}${item.imageUrl}` : null;

          return (
            <Marker
              key={`item-${item._id}`}
              coordinate={{
                latitude: item.location.latitude,
                longitude: item.location.longitude,
              }}
              pinColor={pinColor}
              onPress={() => {
                if (mapRef.current) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: item.location.latitude,
                      longitude: item.location.longitude,
                    },
                    pitch: is3DMode ? 65 : 0,
                    heading: 0,
                    altitude: is3DMode ? 200 : 400, // Zoom in super close to the tapped pin!
                  }, { duration: 800 });
                }
              }}
            >
              {/* Custom Pin Callout */}
              <Callout
                tooltip
                onPress={() => router.push(`/item/${item._id}`)}
              >
                <View style={styles.calloutCard}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.calloutImage} />
                  ) : null}
                  <View style={styles.calloutContent}>
                    <View
                      style={[
                        styles.calloutBadge,
                        { backgroundColor: isLost ? COLORS.lostBg : COLORS.foundBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calloutBadgeText,
                          { color: isLost ? COLORS.lostText : COLORS.foundText },
                        ]}
                      >
                        {isLost ? "LOST" : "FOUND"}
                      </Text>
                    </View>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.calloutLocation} numberOfLines={1}>
                      📍 {item.location?.name}
                    </Text>
                    <Text style={styles.calloutActionText}>Tap to view details ➔</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Top Floating Filter Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all", label: "All Pins", icon: "map" },
            { key: "lost", label: "Lost Items", icon: "alert-circle", color: COLORS.lostText },
            { key: "found", label: "Found Items", icon: "checkmark-circle", color: COLORS.foundText },
            { key: "events", label: "Events", icon: "calendar", color: COLORS.primary },
          ].map((tab) => {
            const isSelected = filterType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
                onPress={() => setFilterType(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isSelected ? "#FFFFFF" : tab.color || COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Recenter & Refresh Controls */}
      <View style={styles.fabContainer}>
        {/* Toggle Map Type Button */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={toggleMapType}
          activeOpacity={0.85}
        >
          <Ionicons 
            name={mapType === "standard" ? "earth" : "map"} 
            size={22} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>

        {/* Toggle 3D Button */}
        <TouchableOpacity
          style={[styles.fabButton, { marginTop: 10 }, is3DMode && styles.fabButtonActive]}
          onPress={toggle3DMode}
          activeOpacity={0.85}
        >
          <Ionicons name="cube" size={22} color={is3DMode ? "#FFFFFF" : COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, { marginTop: 10 }]}
          onPress={handleRecenter}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabButton, { marginTop: 10 }]}
          onPress={fetchMapData}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  fabContainer: {
    position: "absolute",
    right: 16,
    bottom: 32,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fabButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  calloutCard: {
    width: 200,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  calloutImage: {
    width: "100%",
    height: 90,
    borderRadius: 10,
    marginBottom: 8,
  },
  calloutContent: {
    gap: 2,
  },
  calloutBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  calloutBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  calloutLocation: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  calloutActionText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 2,
  },
});
