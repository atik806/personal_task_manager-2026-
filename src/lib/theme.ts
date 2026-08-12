/**
 * Design tokens — "clarity under motion": a near-black canvas, soft
 * off-white ink, and one vibrant indigo/purple accent used sparingly.
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
  canvas: "#F6F6FB",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  fieldBg: "#EFF0F7",
  ink: "#14151C",
  inkSecondary: "#5F6478",
  inkMuted: "#9AA0B4",
  accent: "#6657F2",
  accentDeep: "#7C6BFF",
  accentSoft: "rgba(102,87,242,0.12)",
  danger: "#FF6B5B",
  dangerSoft: "rgba(255,107,91,0.12)",
  success: "#2FAE77",
  successSoft: "rgba(47,174,119,0.14)",
  warning: "#E8960C",
  warningSoft: "rgba(232,150,12,0.14)",
  line: "#E5E6F0",
  lineStrong: "#D4D6E6",
  onAccent: "#FFFFFF",
  scrim: "rgba(20,21,28,0.42)",
  trackBg: "#EDEEF5",
  thumbBg: "#FFFFFF",
  chipBg: "#F0F1F7",
  hover: "rgba(102,87,242,0.08)",
  shadowColor: "#1A1B2E",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  buttonSecondaryBg: "#ECEDF5",
  gradient: ["#6657F2", "#7C6BFF"],
};

export const darkColors: ThemeColors = {
  canvas: "#0B0B10",
  surface: "#101016",
  surfaceElevated: "#15151E",
  fieldBg: "#0E0E14",
  ink: "#F2F2F8",
  inkSecondary: "#8B90A6",
  inkMuted: "#565B70",
  accent: "#7C6BFF",
  accentDeep: "#8B7CFF",
  accentSoft: "rgba(124,107,255,0.16)",
  danger: "#FF7A6B",
  dangerSoft: "rgba(255,122,107,0.12)",
  success: "#3ECB8E",
  successSoft: "rgba(62,203,142,0.14)",
  warning: "#F5B342",
  warningSoft: "rgba(245,179,66,0.14)",
  line: "#1B1B25",
  lineStrong: "#272733",
  onAccent: "#FFFFFF",
  scrim: "rgba(0,0,0,0.62)",
  trackBg: "#0E0E14",
  thumbBg: "#1B1B25",
  chipBg: "#17171F",
  hover: "rgba(124,107,255,0.10)",
  shadowColor: "#000000",
  shadowOpacity: 0.4,
  shadowRadius: 20,
  buttonSecondaryBg: "#1A1A24",
  gradient: ["#7C6BFF", "#8B7CFF"],
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

/**
 * Radius language — one scale used across every component.
 *   xs = 4  · tiny markers (badges, chips, dots)
 *   sm = 8  · small controls (icon buttons, segmented thumb)
 *   md = 12 · buttons, inputs, rows
 *   lg = 14 · cards
 *   xl = 20 · sheets, auth card
 *   pill    · fully rounded (chips, avatars, swatches)
 */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999,
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

/** Accent glow for active elements and primary CTAs — depth without clutter. */
export function glow(
  c: ThemeColors,
  strength: "soft" | "strong" = "soft"
): ElevationPreset {
  return strength === "strong"
    ? {
        shadowColor: c.accent,
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
    : {
        shadowColor: c.accent,
        shadowOpacity: 0.28,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
      };
}
