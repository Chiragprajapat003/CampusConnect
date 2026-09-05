import React from "react";
import { Stack } from "expo-router";

/**
 * Auth Group Layout
 * 
 * WHAT IT DOES:
 * Organizes authentication screens (`login.jsx`, `register.jsx`) in a smooth stack.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
    </Stack>
  );
}
