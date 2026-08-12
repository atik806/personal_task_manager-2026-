import React from "react";
import { View } from "react-native";
import { useTheme } from "../hooks/use-theme";
import type { ThemeColors } from "../lib/theme";

/**
 * The Day Spine — a vertical line running down the left edge of the day's
 * task list with a node at each task. Node color:
 *   muted = pending · danger = overdue · success = done.
 */
export type SpineNodeColor = "pending" | "overdue" | "done";

export function spineColor(kind: SpineNodeColor, colors: ThemeColors): string {
  switch (kind) {
    case "overdue":
      return colors.danger;
    case "done":
      return colors.success;
    default:
      return colors.inkMuted;
  }
}

export function SpineNode({ kind }: { kind: SpineNodeColor }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 28, alignSelf: "stretch", alignItems: "center" }}>
      <View style={{ width: 28, alignItems: "center", flex: 1 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: spineColor(kind, colors),
            marginTop: 7,
          }}
        />
        <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginTop: 3 }} />
      </View>
    </View>
  );
}
