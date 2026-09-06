import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * App Configuration & Dynamic IP Resolution
 * 
 * WHAT IT DOES:
 * Automatically resolves the computer's local Wi-Fi IP address when running on a physical phone via Expo Go,
 * so the phone can seamlessly connect to your Express backend on port 5000.
 * 
 * HOW THIS WORKS:
 * Expo Go knows the host machine's IP (e.g. 192.168.x.x:8081). We dynamically extract the IP
 * from `Constants.expoConfig?.hostUri` so you never have to hardcode IP addresses!
 */

const getDevMachineIP = () => {
  if (Platform.OS === "web") return "localhost";

  // Auto-detect computer IP from Expo host URI when running on physical phone
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return ip;
    }
  }

  // Fallback for Android emulator
  if (Platform.OS === "android") {
    return "10.0.2.2";
  }

  return "localhost";
};

const HOST_IP = getDevMachineIP();

export const API_BASE_URL = Platform.select({
  web: "http://localhost:5000/api",
  default: `http://${HOST_IP}:5000/api`,
});

/**
 * Stitch UI Light Theme Palette
 */
export const LIGHT_THEME = {
  // Brand Primaries (Vibrant Gen-Z Palette)
  primary: "#8B5CF6",       // Electric Violet
  primaryDark: "#7C3AED",   // Deep Violet (active/pressed states)
  primaryLight: "#EDE9FE",  // Violet Tint (backgrounds, badges)
  
  // Secondary / Accent Colors
  accentPink: "#EC4899",
  accentOrange: "#F97316",
  accentTeal: "#14B8A6",
  
  // Neutral Canvas & Text
  background: "#F8FAFC",    // Slate-50 background
  card: "#FFFFFF",          // Pure White card
  textPrimary: "#0F172A",   // Slate-900 high contrast text
  textSecondary: "#475569", // Slate-600 secondary text
  textMuted: "#94A3B8",     // Slate-400 placeholder text
  border: "#E2E8F0",        // Slate-200 border lines
  borderFocus: "#8B5CF6",   // Violet focus ring
  
  // Status Pills (Lost, Found, Resolved)
  lostText: "#E11D48",      // Rose-600
  lostBg: "#FFE4E6",        // Rose-100
  foundText: "#0D9488",     // Teal-600
  foundBg: "#CCFBF1",       // Teal-100
  resolvedText: "#7C3AED",  // Violet-600
  resolvedBg: "#EDE9FE",    // Violet-100
  
  // UI Alerts
  error: "#F43F5E",
  errorBg: "#FFE4E6",
  success: "#10B981",
  successBg: "#D1FAE5",
};

/**
 * Stitch UI Dark Theme Palette (Deep Navy Canvas)
 */
export const DARK_THEME = {
  primary: "#6366F1",       // Bright Indigo for dark backgrounds
  primaryDark: "#4F46E5",
  primaryLight: "#312E81",
  
  background: "#0F172A",    // Deep Navy Slate
  card: "#1E293B",          // Slate 800 Card
  textPrimary: "#F8FAFC",   // Crisp Slate White
  textSecondary: "#94A3B8", // Slate 400
  textMuted: "#64748B",     // Slate 500
  border: "#334155",        // Slate 700 Borders
  borderFocus: "#818CF8",
  
  lostText: "#F87171",
  lostBg: "#450A0A",
  foundText: "#34D399",
  foundBg: "#064E3B",
  resolvedText: "#A78BFA",
  resolvedBg: "#3B0764",
  
  error: "#F87171",
  errorBg: "#450A0A",
  success: "#34D399",
  successBg: "#064E3B",
};

export const COLORS = LIGHT_THEME;
