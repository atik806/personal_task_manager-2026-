import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  size?: number;
  /** when true, uses the success color for the filled state */
  successColor?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Checkbox with a quick fill + tick. ~150ms ease-out, respects reduced motion.
 */
export function Checkbox({
  checked,
  onPress,
  size = 22,
  successColor,
  disabled,
  accessibilityLabel,
}: CheckboxProps) {
  const { colors } = useTheme();
  const [anim] = useState(() => new Animated.Value(checked ? 1 : 0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: checked ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [checked, anim]);

  const fillColor = successColor ? colors.success : colors.accent;
  const tickColor = colors.surface;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.hitArea, pressed ? { opacity: 0.6 } : null]}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: size / 2.5,
            borderColor: checked ? fillColor : colors.line,
            backgroundColor: checked ? fillColor : "transparent",
            borderWidth: 2,
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        >
          <Ionicons name="checkmark" size={size - 8} color={tickColor} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    padding: 4,
  },
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});
