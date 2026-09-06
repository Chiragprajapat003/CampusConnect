import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../lib/config";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both your college email and password.");
      return;
    }

    try {
      setIsLoading(true);
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage(
        error.message || "Failed to log in. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Pill Badge */}
            <View style={styles.topBadgeContainer}>
               <View style={styles.topBadge}>
                 <Text style={styles.topBadgeText}>CAMPUSCONNECT • ROAM</Text>
               </View>
            </View>

            {/* Header Text */}
            <View style={styles.header}>
              <Text style={styles.brandTitle}>Find What's Lost.</Text>
              <Text style={styles.brandTitleAccent}>Discover What's On.</Text>
              <Text style={styles.tagline}>
                Your campus hub for buzzing pop-ups, stolen jackets, and daily student quests.
              </Text>
            </View>

            {/* Login Card Form */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>
                Sign in with your verified college email
              </Text>

              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="yourname@edu.com"
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Get Started with .edu</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>New to CampusConnect?</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.footerLink}> Create an account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F5FF", // Light blue to mimic the top of the gradient
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },
  topBadgeContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  topBadge: {
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#4F46E5",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1,
    textAlign: "center",
  },
  brandTitleAccent: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F43F5E", // Vibrant pink/red
    letterSpacing: -1,
    textAlign: "center",
  },
  tagline: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32, // More rounded like the screenshot
    padding: 24,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 24,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorBg,
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 100, // Pill shape
    paddingHorizontal: 20,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  eyeButton: {
    padding: 8,
  },
  primaryButton: {
    backgroundColor: "#0B1426", // Dark navy almost black
    height: 56,
    borderRadius: 100, // Pill shape
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#0B1426",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: "#64748B",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4F46E5",
  },
});

