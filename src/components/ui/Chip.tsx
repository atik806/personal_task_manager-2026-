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
  const { colors } = useTheme();

  const chipStyle = selected
    ? {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
      }
    : {
        backgroundColor: colors.chipBg,
        borderColor: colors.line,
      };

  const labelStyle = selected
    ? { color: colors.accent, fontFamily: fonts.bodySemiBold }
    : { color: colors.inkSecondary, fontFamily: fonts.bodyMedium };

  const content = (
    <View style={[styles.chip, chipStyle]}>
      {dot && color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text numberOfLines={1} style={[styles.label, labelStyle]}>
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
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [pressed ? { opacity: 0.7 } : null, styles.wrap]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
  },
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
