/**
 * Design tokens — the "clarity under motion" palette.
 * Keep in sync with tailwind.config.js colors.
 */

export interface ThemeColors {
  canvas: string;
  surface: string;
  ink: string;
  inkSecondary: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  line: string;
  /** text on accent backgrounds */
  onAccent: string;
}

export const lightColors: ThemeColors = {
  canvas: "#F6F7FB",
  surface: "#FFFFFF",
  ink: "#1C1E26",
  inkSecondary: "#6B7080",
  accent: "#4C5FD5",
  accentSoft: "#E7EAFB",
  danger: "#FF6B5B",
  dangerSoft: "#FDEAE7",
  success: "#34B27B",
  successSoft: "#E4F4EC",
  line: "#E4E6EF",
  onAccent: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  canvas: "#14161C",
  surface: "#1B1E28",
  ink: "#F1F2F6",
  inkSecondary: "#A0A5B4",
  accent: "#6E7EF0",
  accentSoft: "#262C4D",
  danger: "#FF7A6B",
  dangerSoft: "#3A2624",
  success: "#3ECB8E",
  successSoft: "#1E332B",
  line: "#262A35",
  onAccent: "#0F1117",
};

/** Font families as loaded by expo-font / Google Fonts packages. */
export const fonts = {
  display: "SpaceGrotesk_500Medium",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Minimum touch target, per design system. */
export const MIN_TOUCH = 44 as const;
