import React, { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { fonts, radius } from "../lib/theme";
import { tapHaptic } from "../lib/haptics";

/**
 * Primary mobile navigation. All six destinations get an equal flex column so
 * labels never collide: every tab is one fixed-width column containing a
 * centered icon + label, with the active tab highlighted by an accent pill.
 */
const TABS: {
  href: Href;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}[] = [
  { href: "/", label: "Today", iconActive: "sunny", iconInactive: "sunny-outline" },
  { href: "/upcoming", label: "Upcoming", iconActive: "calendar", iconInactive: "calendar-outline" },
  { href: "/projects", label: "Projects", iconActive: "folder", iconInactive: "folder-outline" },
  { href: "/tags", label: "Tags", iconActive: "pricetag", iconInactive: "pricetag-outline" },
  { href: "/search", label: "Search", iconActive: "search", iconInactive: "search-outline" },
  { href: "/settings", label: "Settings", iconActive: "settings", iconInactive: "settings-outline" },
];

/** Pops the pill (scale 0.92→1) when a tab becomes active instead of snapping. */
function TabPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (active) {
      if (reduced) {
        scale.setValue(1);
        return;
      }
      scale.setValue(0.92);
      Animated.spring(scale, {
        toValue: 1,
        speed: 24,
        bounciness: 5,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(1);
    }
  }, [active, reduced, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export function BottomTabBar() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (Platform.OS === "web") return null;

  const isActive = (href: Href) => pathname === String(href);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link key={tab.label} href={tab.href} asChild accessibilityLabel={tab.label}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={tapHaptic}
              style={({ pressed }) => [
                styles.tab,
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <TabPill active={active}>
                <View
                  style={[
                    styles.pill,
                    active ? { backgroundColor: colors.accentSoft } : null,
                  ]}
                >
                  <Ionicons
                    name={active ? tab.iconActive : tab.iconInactive}
                    size={22}
                    color={active ? colors.accent : colors.inkSecondary}
                  />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={[
                      styles.label,
                      {
                        fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
                        color: active ? colors.accent : colors.inkSecondary,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TabPill>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    height: 58,
  },
  pill: {
    minWidth: 0,
    maxWidth: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    maxWidth: "100%",
  },
});
