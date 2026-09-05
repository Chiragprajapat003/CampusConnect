import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { getStorageItem, setStorageItem } from "../lib/storage";
import { LIGHT_THEME, DARK_THEME } from "../lib/config";

const ThemeContext = createContext({
  isDark: false,
  colors: LIGHT_THEME,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = "campusconnect_theme_pref";

/**
 * Theme Provider Component
 * 
 * WHAT IT DOES:
 * Allows students to switch between Light Mode and Dark Mode (Deep Navy),
 * persisting their preference across app launches in SecureStore / storage.
 */
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");

  useEffect(() => {
    // Load persisted theme preference
    async function loadTheme() {
      try {
        const saved = await getStorageItem(THEME_STORAGE_KEY);
        if (saved !== null) {
          setIsDark(saved === "dark");
        }
      } catch (err) {
        console.log("Could not load theme pref:", err.message);
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextState = !isDark;
    setIsDark(nextState);
    try {
      await setStorageItem(THEME_STORAGE_KEY, nextState ? "dark" : "light");
    } catch (err) {
      console.log("Could not save theme pref:", err.message);
    }
  };

  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
