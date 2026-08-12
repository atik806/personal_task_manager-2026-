import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../hooks/use-theme";
import { fonts, glow, MIN_TOUCH, radius } from "../../lib/theme";

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
  const { colors } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      speed: 40,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const isSolid = variant === "primary" || variant === "danger";
  const fg =
    variant === "primary" || variant === "danger"
      ? variant === "primary"
        ? colors.onAccent
        : "#FFFFFF"
      : colors.ink;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: disabled || loading }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        style={({ pressed, hovered }) => [
          styles.base,
          variant === "ghost" ? { borderColor: colors.line } : null,
          variant === "secondary" ? { backgroundColor: colors.buttonSecondaryBg, borderColor: "transparent" } : null,
          variant === "danger" ? { backgroundColor: colors.danger, borderColor: "transparent" } : null,
          !isSolid && (pressed || (Platform.OS === "web" && hovered)) ? { backgroundColor: colors.hover } : null,
          disabled || loading ? { opacity: 0.5 } : null,
          variant === "primary"
            ? {
                ...glow(colors, "soft"),
                borderRadius: radius.pill,
                shadowOpacity: disabled ? 0 : 0.4,
              }
            : null,
          { minHeight: MIN_TOUCH },
        ]}
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
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
                  fontFamily: isSolid ? fonts.bodySemiBold : fonts.bodyMedium,
                },
              ]}
            >
              {label}
            </Text>
          </React.Fragment>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
});
