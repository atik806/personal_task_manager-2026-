/**
 * Design tokens — the "clarity under motion" palette.
 * Keep in sync with tailwind.config.js colors.
 */

export interface ThemeColors {
  canvas: string;
  surface: string;
  /** Elevated cards / panels — slightly lifted from surface. */
  surfaceElevated: string;
  /** Text input / filled control background. */
  fieldBg: string;
  ink: string;
  inkSecondary: string;
  /** Tertiary text, placeholders. */
  inkMuted: string;
  accent: string;
  /** Gradient end for primary actions. */
  accentDeep: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  line: string;
  /** Stronger hairlines (dividers, borders on hover). */
  lineStrong: string;
  /** text on accent backgrounds */
  onAccent: string;
  /** Sheet / modal backdrop. */
  scrim: string;
  /** Segmented control track. */
  trackBg: string;
  /** Segmented control active thumb. */
  thumbBg: string;
  /** Unselected chip / pill background. */
  chipBg: string;
  /** Web hover tint. */
  hover: string;
  /** Soft shadow for elevated surfaces. */
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  /** Secondary button fill. */
  buttonSecondaryBg: string;
  /** Accent gradient stops for primary actions. */
  gradient: [string, string];
}

export const lightColors: ThemeColors = {
  canvas: "#F4F5FB",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  fieldBg: "#F0F1F9",
  ink: "#181A23",
  inkSecondary: "#6B7080",
  inkMuted: "#9BA0B0",
  accent: "#4C5FD5",
  accentDeep: "#6E4FEA",
  accentSoft: "#E8EBFB",
  danger: "#FF6B5B",
  dangerSoft: "#FDEAE7",
  success: "#2FAE77",
  successSoft: "#E4F4EC",
  warning: "#E8960C",
  warningSoft: "#FBF0DC",
  line: "#E4E6EF",
  lineStrong: "#D4D7E6",
  onAccent: "#FFFFFF",
  scrim: "rgba(16,18,28,0.42)",
  trackBg: "#ECEEF5",
  thumbBg: "#FFFFFF",
  chipBg: "#F0F1F7",
  hover: "rgba(76,95,213,0.06)",
  shadowColor: "#1A1E3C",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  buttonSecondaryBg: "#EDEFF6",
  gradient: ["#4C5FD5", "#6E4FEA"],
};

export const darkColors: ThemeColors = {
  canvas: "#10121A",
  surface: "#171A24",
  surfaceElevated: "#1C202C",
  fieldBg: "#0E1017",
  ink: "#F1F2F6",
  inkSecondary: "#A0A5B4",
  inkMuted: "#5A5F6E",
  accent: "#6E7EF0",
  accentDeep: "#8B5CF6",
  accentSoft: "#262C4D",
  danger: "#FF7A6B",
  dangerSoft: "#3A2624",
  success: "#3ECB8E",
  successSoft: "#1E332B",
  warning: "#F5B342",
  warningSoft: "#3A3018",
  line: "#262A35",
  lineStrong: "#333949",
  onAccent: "#0F1117",
  scrim: "rgba(0,0,0,0.6)",
  trackBg: "#0E1017",
  thumbBg: "#1B1E28",
  chipBg: "#232836",
  hover: "rgba(110,126,240,0.10)",
  shadowColor: "#000000",
  shadowOpacity: 0.35,
  shadowRadius: 18,
  buttonSecondaryBg: "#2A2F3E",
  gradient: ["#6E7EF0", "#8B5CF6"],
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

/** Shadow presets derived from the active theme's tokens. */
export interface ElevationPreset {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export function elevation(c: ThemeColors, level: "sm" | "md" | "lg"): ElevationPreset {
  const base = { shadowColor: c.shadowColor, shadowOpacity: c.shadowOpacity };
  switch (level) {
    case "sm":
      return {
        ...base,
        shadowOpacity: Math.min(base.shadowOpacity * 0.6, 0.18),
        shadowRadius: Math.min(8, c.shadowRadius * 0.6),
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      };
    case "lg":
      return {
        ...base,
        shadowRadius: c.shadowRadius * 1.6,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      };
    default:
      return {
        ...base,
        shadowRadius: c.shadowRadius,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      };
  }
}
