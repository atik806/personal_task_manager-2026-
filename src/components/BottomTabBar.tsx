import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Link, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";

const TABS: { href: Href; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { href: "/", label: "Today", icon: "sun" },
  { href: "/upcoming", label: "Upcoming", icon: "calendar" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/settings", label: "Settings", icon: "settings" },
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
          paddingBottom: Math.max(insets.bottom, 8),
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
                <Feather name={tab.icon} size={19} color={active ? colors.accent : colors.inkSecondary} />
              </View>
              <Text
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
    minHeight: 52,
  },
  pill: {
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
