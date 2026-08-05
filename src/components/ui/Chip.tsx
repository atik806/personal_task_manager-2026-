import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/use-theme";
import { fonts } from "../../lib/theme";

interface ChipProps {
  label: string;
  color?: string;
  onPress?: () => void;
  selected?: boolean;
  /** whether the color dot should be shown */
  dot?: boolean;
}

export function Chip({ label, color, onPress, selected, dot = true }: ChipProps) {
  const { colors, isDark } = useTheme();
  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : isDark ? "#232836" : "#F0F1F7",
          borderColor: selected ? colors.accent : colors.line,
        },
      ]}
    >
      {dot && color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: selected ? colors.onAccent : colors.inkSecondary, fontFamily: fonts.bodyMedium },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 180,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
  },
});
