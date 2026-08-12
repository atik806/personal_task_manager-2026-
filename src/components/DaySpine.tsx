import type { ThemeColors } from "../lib/theme";

/**
 * Status color for a task's leading dot. Mirrors the task lifecycle:
 *   muted = pending · danger = overdue · accent = done.
 * "done" intentionally uses the brand violet (not green) so completion stays
 * consistent with the rest of the accent system.
 */
export type SpineNodeColor = "pending" | "overdue" | "done";

export function spineColor(kind: SpineNodeColor, colors: ThemeColors): string {
  switch (kind) {
    case "overdue":
      return colors.danger;
    case "done":
      return colors.accent;
    default:
      return colors.inkMuted;
  }
}
