import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../hooks/use-theme";
import { MIN_TOUCH } from "../../lib/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, isDark } = useTheme();

  const bg =
    variant === "primary"
      ? colors.accent
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? isDark
            ? "#2A2F3E"
            : "#EDEFF6"
          : "transparent";

  const fg =
    variant === "primary"
      ? colors.onAccent
      : variant === "danger"
        ? "#FFFFFF"
        : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: variant === "ghost" ? colors.line : "transparent" },
        pressed && !disabled ? { opacity: 0.82 } : null,
        disabled || loading ? { opacity: 0.5 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <React.Fragment>
          {icon}
          <Text
            style={[
              styles.label,
              {
                color: fg,
                fontFamily: variant === "primary" || variant === "danger" ? "Inter_600SemiBold" : "Inter_500Medium",
              },
            ]}
          >
            {label}
          </Text>
        </React.Fragment>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
});
