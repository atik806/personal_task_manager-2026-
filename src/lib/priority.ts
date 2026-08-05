/**
 * Priority helpers — pure, no React Native imports.
 */
import type { Priority } from "./types";

export const PRIORITY_ORDER: Priority[] = ["low", "medium", "high"];

export function priorityWeight(p: Priority | null | undefined): number {
  switch (p) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export function priorityLabel(p: Priority | null | undefined): string {
  switch (p) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "None";
  }
}

/** Human-readable word list for smart parsing + chips. */
export const PRIORITY_WORDS: Record<string, Priority> = {
  high: "high",
  urgent: "high",
  "!!": "high",
  "!!!": "high",
  medium: "medium",
  normal: "medium",
  "!": "medium",
  low: "low",
  minor: "low",
};

/** Parse a priority word to a typed value; default fallback. */
export function parsePriority(s: string | null | undefined, fallback: Priority = "medium"): Priority {
  if (!s) return fallback;
  const key = s.trim().toLowerCase();
  return PRIORITY_WORDS[key] ?? fallback;
}

/** Accent color used sparingly in the UI. */
export function priorityColor(p: Priority | null | undefined): string {
  switch (p) {
    case "high":
      return "#FF6B5B";
    case "medium":
      return "#4C5FD5";
    case "low":
      return "#6B7080";
    default:
      return "#6B7080";
  }
}

/** Sort comparator: high > medium > low > none. */
export function comparePriority(a: Priority | null | undefined, b: Priority | null | undefined): number {
  return priorityWeight(b) - priorityWeight(a);
}
