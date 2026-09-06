import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { enableScreens } from "react-native-screens";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, LogBox } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { NotificationProvider } from "../context/NotificationContext";
import { COLORS } from "../lib/config";

// Ignore Expo Go push notification deprecation warning banner
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "Android Push notifications (remote notifications)",
]);

// Disable native screen fragments to prevent Android Fabric ViewManager casting crashes
enableScreens(false);

/**
 * Navigation Guard Component
 * 
 * WHAT IT DOES:
 * Watches the `isAuthenticated` state and the user's current URL route (`segments`).
 * Automatically redirects users:
 * - Unauthenticated users -> sent to `/(auth)/login`
 * - Authenticated users -> sent to `/(tabs)/home`
 * 
 * WHY IT'S STRUCTURED THIS WAY:
 * Using an effect in the root layout guarantees protected screens can never be
 * accessed without a valid, verified JWT session.
 */
function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark, colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until SecureStore has checked for a stored token

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // If user is not logged in and not on a login/register/onboarding screen, redirect to onboarding
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && inAuthGroup) {
      // If user is logged in but still on login/register screen, redirect to main tabs
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <NavigationGuard />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
