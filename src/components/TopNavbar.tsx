import React, { useEffect, useReducer, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { profileMenuReducer } from "../lib/profile-menu";
import { elevation, fonts, radius } from "../lib/theme";

/** Below this width the bar uses tighter spacing (labels always stay visible). */
const COMPACT_BREAKPOINT = 820;

/** Web-only background-color transition for hover/press polish. */
const BG_TRANSITION = {
  transition: "background-color 0.15s ease",
} as unknown as ViewStyle;

/** Tracks web hover state so icon buttons can show a label tooltip. */
function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    onHoverIn: () => setHovered(true),
    onHoverOut: () => setHovered(false),
  };
}

/** Floating label shown beside icon buttons on web. Never intercepts input. */
function Tooltip({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={styles.tooltipWrap}>
      <View
        style={[
          styles.tooltip,
          { backgroundColor: colors.surfaceElevated, borderColor: colors.lineStrong },
        ]}
      >
        <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

/** Dropdown menu row — settings link, theme toggle, sign out. */
function MenuItem({ icon, label, danger, trailing, onPress }: MenuItemProps) {
  const { colors } = useTheme();
  const hover = useHover();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={hover.onHoverIn}
      onHoverOut={hover.onHoverOut}
      style={({ pressed }) => [
        styles.menuItem,
        hover.hovered && danger
          ? { backgroundColor: colors.dangerSoft }
          : Platform.OS === "web" && hover.hovered
            ? { backgroundColor: colors.hover }
            : null,
        pressed ? { opacity: 0.85 } : null,
        Platform.OS === "web" ? BG_TRANSITION : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={hover.hovered && danger ? colors.danger : colors.inkSecondary}
      />
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: fonts.bodyMedium,
          fontSize: 14,
          color: hover.hovered && danger ? colors.danger : colors.ink,
        }}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}

/** Web top navbar: profile menu pinned to the right edge. */
export function TopNavbar() {
  const { colors, isDark, toggle } = useTheme();
  const { user, signOut } = useAuth();

  const [menuOpen, dispatchMenu] = useReducer(profileMenuReducer, "closed");
  const [windowWidth, setWindowWidth] = useState(1200);
  const wrapRef = useRef<View>(null);
  const router = useRouter();
  const hoverProfile = useHover();

  const email = user?.email ?? "";
  const displayName = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
  const initial = (displayName || email).trim().charAt(0).toUpperCase() || "U";

  const compact = windowWidth < COMPACT_BREAKPOINT;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setWindowWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Close the menu on Escape while it's open. Outside clicks close via the
  // full-screen backdrop below (a window "pointerdown"/"click" listener would
  // race the same click that opened the menu and is unnecessary here).
  useEffect(() => {
    if (menuOpen !== "open" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatchMenu({ type: "close" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (Platform.OS !== "web") return null;

  return (
    <View
      style={[
        styles.bar,
        compact ? styles.barCompact : null,
        menuOpen === "open" ? styles.barRaised : null,
        { backgroundColor: colors.surface, borderBottomColor: colors.line },
      ]}
    >
      <View style={styles.profileWrap} ref={wrapRef}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          accessibilityState={{ expanded: menuOpen === "open" }}
          onPress={() => dispatchMenu({ type: "toggle" })}
          onHoverIn={hoverProfile.onHoverIn}
          onHoverOut={hoverProfile.onHoverOut}          style={({ pressed }) => [
            styles.profileBtn,
            { borderColor: colors.line },
            menuOpen === "open" || hoverProfile.hovered ? { backgroundColor: colors.hover } : null,
            pressed ? styles.pressed : null,
            Platform.OS === "web" ? BG_TRANSITION : null,
          ]}
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileAvatar}
          >
            <Text style={[styles.profileAvatarLetter, { color: colors.onAccent }]}>{initial}</Text>
          </LinearGradient>
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={[styles.profileName, { color: colors.ink }]}>
              {displayName || "Account"}
            </Text>
            {!compact && email ? (
              <Text numberOfLines={1} style={[styles.profileEmail, { color: colors.inkSecondary }]}>
                {email}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.inkSecondary} />
          {hoverProfile.hovered ? <Tooltip label="Account" /> : null}
        </Pressable>

        {menuOpen === "open" ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              onPress={() => dispatchMenu({ type: "close" })}
              style={styles.menuBackdrop}
            />
            <View
              style={[
                styles.menu,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.lineStrong },
                elevation(colors, "lg"),
              ]}
            >
            <View style={styles.menuHeader}>
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuAvatar}
              >
                <Text style={[styles.menuAvatarLetter, { color: colors.onAccent }]}>{initial}</Text>
              </LinearGradient>
              <View style={styles.menuHeaderText}>
                <Text numberOfLines={1} style={[styles.menuName, { color: colors.ink }]}>
                  {displayName || "My account"}
                </Text>
                {email ? (
                  <Text numberOfLines={1} style={[styles.menuEmail, { color: colors.inkSecondary }]}>
                    {email}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.line }]} />

            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={() => {
                dispatchMenu({ type: "close" });
                router.push("/settings");
              }}
            />
            <MenuItem
              icon={isDark ? "sunny-outline" : "moon-outline"}
              label={isDark ? "Light mode" : "Dark mode"}
              onPress={toggle}
              trailing={
                <Switch
                  pointerEvents="none"
                  value={isDark}
                  trackColor={{ true: colors.accent, false: colors.line }}
                  thumbColor={colors.surface}
                  ios_backgroundColor={colors.line}
                />
              }
            />

            <View style={[styles.menuDivider, { backgroundColor: colors.line }]} />

            <MenuItem
              icon="log-out-outline"
              label="Sign out"
              danger
              onPress={() => {
                dispatchMenu({ type: "close" });
                signOut();
              }}
            />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    gap: 12,
    borderBottomWidth: 1,
  },
  barCompact: {
    paddingHorizontal: 14,
    gap: 8,
  },
  // RNW gives every View position:relative + z-index:0 by default, so the
  // bar's stacking context would otherwise paint below the later route-content
  // sibling and the dropdown (z-index 1001) would be hidden behind it. Lifting
  // the bar while the menu is open puts the whole bar + dropdown above content.
  barRaised: {
    zIndex: 40,
  },
  profileWrap: {
    position: "relative",
  },
  profileBtn: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    position: "relative",
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarLetter: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  profileText: {
    flexShrink: 1,
    maxWidth: 200,
    gap: 1,
  },
  profileName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  profileEmail: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  menu: {
    position: "absolute",
    top: 62,
    right: 0,
    minWidth: 248,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
    zIndex: 1001,
    gap: 2,
  },
  // Transparent full-screen layer that swallows any click outside the menu so
  // the dropdown closes reliably. Must stay below the menu but above the bar
  // and route content.
  menuBackdrop: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  menuAvatarLetter: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  menuHeaderText: {
    flex: 1,
    gap: 1,
  },
  menuName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  menuEmail: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  menuItem: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  tooltipWrap: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  tooltip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    maxWidth: 180,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
} as const);
