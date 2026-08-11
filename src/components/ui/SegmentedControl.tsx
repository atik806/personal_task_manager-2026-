import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/use-theme";
import { fonts } from "../../lib/theme";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const count = options.length;

  const [thumb] = useState(() => new Animated.Value(index));
  const reducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reducedMotion.current = v));
  }, []);

  useEffect(() => {
    if (reducedMotion.current) {
      thumb.setValue(index);
    } else {
      Animated.spring(thumb, {
        toValue: index,
        speed: 22,
        bounciness: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [index, thumb]);

  const thumbLeft = thumb.interpolate({
    inputRange: [0, count - 1],
    outputRange: Array.from({ length: count }, (_, i) => `${(i * 100) / count}%`),
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.trackBg, borderColor: colors.line },
      ]}
      accessibilityRole="tablist"
    >
      <Animated.View
        style={[
          styles.thumb,
          { width: `${100 / count}%`, left: thumbLeft, backgroundColor: colors.thumbBg, shadowColor: colors.shadowColor },
        ]}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [styles.item, pressed ? { opacity: 0.8 } : null]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
                fontSize: 13,
                color: active ? colors.ink : colors.inkSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  thumb: {
    position: "absolute",
    top: 3,
    bottom: 3,
    borderRadius: 8,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  item: {
    flex: 1,
    minHeight: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    zIndex: 1,
  },
});
