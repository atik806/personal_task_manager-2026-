import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { elevation, fonts, glow, radius } from "../lib/theme";
import { NAV_ITEMS } from "../lib/navigation";
import { tapHaptic } from "../lib/haptics";
import { useSheetVisibility } from "./SheetVisibilityProvider";

/** Web-only background-color transition for hover/press polish. */
const BG_TRANSITION = {
  transition: "background-color 0.15s ease",
} as unknown as ViewStyle;

interface NavMenuPanelProps {
  /** Position overrides for the dropdown (the caller anchors it to its trigger). */
  style?: StyleProp<ViewStyle>;
  /** Called after a destination is chosen so the caller can close its menu. */
  onNavigate?: () => void;
}

/** Shared destinations dropdown — highlights the active route, navigates on press. */
export function NavMenuPanel({ style, onNavigate }: NavMenuPanelProps) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const go = (href: Href) => {
    tapHaptic();
    onNavigate?.();
    router.push(href);
  };

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.lineStrong },
        elevation(colors, "lg"),
        style,
      ]}
    >
      {NAV_ITEMS.map((item) => {
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
                : Platform.OS === "web" && hovered
                  ? { backgroundColor: colors.hover }
                  : null,
              pressed ? { opacity: 0.85 } : null,
              Platform.OS === "web" ? BG_TRANSITION : null,
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
  );
}

/** Floating bottom-left nav menu (mobile only): FAB toggle that opens destinations. */
export function NavMenu() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { isSheetOpen } = useSheetVisibility();

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

  // On web the destinations menu lives in the top navbar, so the FAB is
  // redundant there.
  if (web) return null;

  // Hide the whole menu (FAB + open panel) while any sheet is open so it never
  // overlaps the sheet's footer actions.
  if (isSheetOpen) return null;

  const toggle = () => {
    tapHaptic();
    setOpen((v) => !v);
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
          <NavMenuPanel
            style={{ left: 20, bottom: 158 + insets.bottom }}
            onNavigate={() => setOpen(false)}
          />
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed, hovered }) => [
          styles.fab,
          { bottom: 88 + insets.bottom, ...glow(colors, "strong") },
          hovered && !pressed ? styles.fabLift : null,
          pressed ? { opacity: 0.85, transform: [{ scale: 0.92 }] } : null,
        ]}
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="grid-outline" size={24} color={colors.onAccent} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen hit-test container that is never a touch target itself (see
  // pointerEvents="box-none"), so the panel's backdrop can span the whole app
  // from a corner-anchored FAB.
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
  fabLift: {
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
