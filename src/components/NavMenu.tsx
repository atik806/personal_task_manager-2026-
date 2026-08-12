import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { elevation, fonts, glow, radius } from "../lib/theme";
import { tapHaptic } from "../lib/haptics";

const ITEMS: { href: Href; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { href: "/", label: "Today", icon: "sunny-outline" },
  { href: "/upcoming", label: "Upcoming", icon: "calendar-outline" },
  { href: "/projects", label: "Projects", icon: "folder-outline" },
  { href: "/tags", label: "Tags", icon: "pricetag-outline" },
  { href: "/search", label: "Search", icon: "search-outline" },
];

/** Web-only background-color transition for hover/press polish. */
const BG_TRANSITION = {
  transition: "background-color 0.15s ease",
} as unknown as ViewStyle;

/** Floating bottom-left nav menu: FAB toggle that opens the app's destinations. */
export function NavMenu() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const web = Platform.OS === "web";

  // Close the menu on Escape while it's open (web only). Taps anywhere else
  // close via the full-screen backdrop below.
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    tapHaptic();
    setOpen((v) => !v);
  };

  const go = (href: Href) => {
    tapHaptic();
    setOpen(false);
    router.push(href);
  };

  return (
    <View style={[styles.container, open ? styles.containerRaised : null]} pointerEvents="box-none">
      {open ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View
            style={[
              styles.panel,
              {
                left: web ? 24 : 20,
                bottom: web ? 82 : 158 + insets.bottom,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.lineStrong,
              },
              elevation(colors, "lg"),
            ]}
          >
            {ITEMS.map((item) => {
              const active = pathname === String(item.href);
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => go(item.href)}
                  style={({ pressed, hovered }) => [
                    styles.item,
                    active
                      ? { backgroundColor: colors.accentSoft }
                      : web && hovered
                        ? { backgroundColor: colors.hover }
                        : null,
                    pressed ? { opacity: 0.85 } : null,
                    web ? BG_TRANSITION : null,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? colors.accent : colors.inkSecondary}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: active ? colors.accent : colors.ink,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed, hovered }) => [
          web ? styles.fabWeb : styles.fab,
          { bottom: web ? 24 : 88 + insets.bottom, ...glow(colors, "strong") },
          web && hovered && !pressed ? styles.fabWebLift : null,
          pressed ? { opacity: 0.85, transform: [{ scale: web ? 0.96 : 0.92 }] } : null,
        ]}
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={web ? styles.fabWebGradient : styles.fabGradient}
        >
          <Ionicons name="grid-outline" size={web ? 20 : 24} color={colors.onAccent} />
          {web ? (
            <Text style={[styles.fabLabel, { color: colors.onAccent }]}>Menu</Text>
          ) : null}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen hit-test container that is never a touch target itself (see
  // pointerEvents="box-none"), so the panel's backdrop can span the whole app
  // from a corner-anchored FAB. RNW gives every View position:relative +
  // z-index:0 (its own stacking context), so the container must be lifted
  // above the earlier route-content sibling while the menu is open — the same
  // trick TopNavbar uses with barRaised.
  container: {
    ...StyleSheet.absoluteFill,
  },
  containerRaised: {
    zIndex: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  panel: {
    position: "absolute",
    width: 248,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
    gap: 2,
    zIndex: 1001,
  },
  fab: {
    position: "absolute",
    left: 20,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabWeb: {
    position: "absolute",
    left: 24,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fabWebGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  fabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  fabWebLift: {
    transform: [{ translateY: -2 }],
  },
  item: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
} as const);
