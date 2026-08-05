import React from "react";
import { View } from "react-native";
import { useTheme } from "../hooks/use-theme";

/**
 * The Day Spine — a vertical line running down the left edge of the day's
 * task list with a node at each task. Node color:
 *   grey = pending · coral = overdue · green = done.
 */
export type SpineNodeColor = "pending" | "overdue" | "done";

export function spineColor(kind: SpineNodeColor): string {
  switch (kind) {
    case "overdue":
      return "#FF6B5B";
    case "done":
      return "#34B27B";
    default:
      return "#9BA0B0";
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
            backgroundColor: spineColor(kind),
            marginTop: 7,
          }}
        />
        <View style={{ width: 2, flex: 1, backgroundColor: colors.line, marginTop: 3 }} />
      </View>
    </View>
  );
}
