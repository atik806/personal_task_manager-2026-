import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { fonts, radius } from "../lib/theme";
import { tapHaptic } from "../lib/haptics";

const TABS: {
  href: Href;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}[] = [
  { href: "/", label: "Today", iconActive: "sunny", iconInactive: "sunny-outline" },
  { href: "/upcoming", label: "Upcoming", iconActive: "calendar", iconInactive: "calendar-outline" },
  { href: "/projects", label: "Projects", iconActive: "folder", iconInactive: "folder-outline" },
  { href: "/settings", label: "Settings", iconActive: "settings", iconInactive: "settings-outline" },
];

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
              <View
                style={[
                  styles.pill,
                  active ? { backgroundColor: colors.accentSoft } : null,
                ]}
              >
                <Ionicons
                  name={active ? tab.iconActive : tab.iconInactive}
                  size={24}
                  color={active ? colors.accent : colors.inkSecondary}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
                  fontSize: 11,
                  color: active ? colors.accent : colors.inkSecondary,
                }}
              >
                {tab.label}
              </Text>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minHeight: 56,
  },
  pill: {
    minWidth: 48,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
