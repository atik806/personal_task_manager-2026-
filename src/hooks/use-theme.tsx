import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { colorScheme as nativewindColorScheme } from "nativewind";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "../lib/theme";
import { storage, THEME_STORAGE_KEY } from "../lib/storage";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  const saved = storage.getItemSync(THEME_STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  const effectiveDark = useMemo(() => {
    if (mode === "system") return systemScheme === "dark";
    return mode === "dark";
  }, [mode, systemScheme]);

  useEffect(() => {
    nativewindColorScheme.set(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    storage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setMode(effectiveDark ? "light" : "dark");
  }, [effectiveDark, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      toggle,
      isDark: effectiveDark,
      colors: effectiveDark ? darkColors : lightColors,
    }),
    [mode, setMode, toggle, effectiveDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
