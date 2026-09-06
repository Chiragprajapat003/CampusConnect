import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import * as Animatable from "react-native-animatable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── FULLSCREEN BACKGROUND ARTWORK ─── */}
      <Animatable.Image 
        animation="fadeIn" 
        duration={1500}
        source={require("../../assets/images/gate.jpg")} 
        style={styles.backgroundImage}
      />

      {/* ─── GRADIENT OVERLAYS ─── */}
      {/* Top gradient for the logo */}
      <LinearGradient
        colors={["rgba(15,17,26,0.8)", "transparent"]}
        style={styles.topGradient}
      />
      
      {/* Bottom gradient for the text and buttons */}
      <LinearGradient
        colors={["transparent", "rgba(15,17,26,0.8)", "#0F111A"]}
        style={styles.bottomGradient}
      />

      <View style={[styles.contentContainer, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        
        {/* ─── BRAND LOGO ─── */}
        <Animatable.View animation="fadeInDown" delay={400} duration={1000} style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="school" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>
              Campus<Text style={styles.brandTitleHighlight}>Connect</Text>
            </Text>
          </View>
        </Animatable.View>

        {/* ─── FLOATING TAGS (ANIMATED) ─── */}
        <View style={styles.tagsContainer}>
          <Animatable.View 
            animation="fadeInLeft" 
            delay={1000} 
            style={[styles.floatingTag, styles.tagTopLeft]}
          >
            <Ionicons name="checkmark-circle" size={14} color="#34D399" />
            <Text style={styles.tagText}>AirPods Found</Text>
          </Animatable.View>

          <Animatable.View 
            animation="fadeInRight" 
            delay={1400} 
            style={[styles.floatingTag, styles.tagBottomRight]}
          >
            <Ionicons name="alert-circle" size={14} color="#F87171" />
            <Text style={styles.tagText}>Keys Lost</Text>
          </Animatable.View>
        </View>

        {/* ─── BOTTOM SECTION (TEXT & BUTTONS) ─── */}
        <View style={styles.bottomSection}>
          <View style={styles.textContainer}>
            <Animatable.Text animation="fadeInUp" delay={800} style={styles.headline}>
              Lost something?{"\n"}Found something?
            </Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={1000} style={styles.subheadline}>
              Your campus, connected. Join the community to recover lost items and help others.
            </Animatable.Text>
          </View>

          <Animatable.View animation="fadeInUp" delay={1200} style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F111A",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6, // Only take up the top 60% so less of the width is cropped!
    resizeMode: "cover",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: "absolute",
    top: height * 0.25, // Start blending earlier
    left: 0,
    right: 0,
    height: height * 0.4, // Create a massive smooth fade into the dark background
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8B5CF6", // Vibrant purple
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandTitleHighlight: {
    color: "#8B5CF6",
  },
  tagsContainer: {
    flex: 1,
    position: "relative",
  },
  floatingTag: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 17, 26, 0.75)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tagTopLeft: {
    top: "30%",
    left: "5%",
  },
  tagBottomRight: {
    top: "50%",
    right: "5%",
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bottomSection: {
    width: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  headline: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subheadline: {
    fontSize: 16,
    fontWeight: "500",
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#C0C2FA",
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C0C2FA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: "#1E1B4B",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
