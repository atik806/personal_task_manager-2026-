import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Link, usePathname, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { fonts } from "../lib/theme";
import { useQuickAdd } from "./QuickAddProvider";

const NAV_ITEMS: { href: Href; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { href: "/", label: "Today", icon: "sun" },
  { href: "/upcoming", label: "Upcoming", icon: "calendar" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/tags", label: "Tags", icon: "tag" },
  { href: "/search", label: "Search", icon: "search" },
];

interface NavItemProps {
  href: Href;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ href, label, icon, active, collapsed }: NavItemProps) {
  const { colors } = useTheme();
  return (
    <Link href={href} asChild accessibilityLabel={label}>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
        style={({ pressed, hovered }) => [
          styles.navItem,
          collapsed ? styles.navItemCollapsed : null,
          (Platform.OS === "web" && hovered) && !active ? { backgroundColor: colors.hover } : null,
          pressed ? { opacity: 0.8 } : null,
        ]}
      >
        {active ? (
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activePill}
          />
        ) : null}
        <Feather name={icon} size={18} color={active ? colors.onAccent : colors.inkSecondary} />
        {!collapsed ? (
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
              fontSize: 14,
              color: active ? colors.onAccent : colors.inkSecondary,
            }}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

export function Sidebar() {
  const { colors, isDark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { open: openQuickAdd } = useQuickAdd();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const collapsed = width < 1024;

  if (Platform.OS !== "web") return null;

  const isActive = (href: Href) => {
    const target = href === "/" ? "/" : String(href);
    return pathname === target;
  };

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderRightColor: colors.line, width: collapsed ? 76 : 240 },
      ]}
    >
      <View style={styles.brandRow}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.logo, { shadowColor: colors.accent }]}
        >
          <Feather name="sun" size={16} color={colors.onAccent} />
        </LinearGradient>
        {!collapsed ? (
          <Text style={[styles.brand, { color: colors.ink, fontFamily: fonts.displayBold }]}>Daymark</Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={openQuickAdd}
        style={({ pressed }) => [
          styles.newTaskBtn,
          collapsed ? styles.newTaskBtnCollapsed : null,
          pressed ? { opacity: 0.85 } : null,
        ]}
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Feather name="plus" size={18} color={colors.onAccent} />
        {!collapsed ? (
          <Text style={[styles.newTaskText, { color: colors.onAccent, fontFamily: fonts.bodySemiBold }]}>
            New task
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.label}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      <NavItem href={"/settings"} label="Settings" icon="settings" active={pathname === "/settings"} collapsed={collapsed} />

      <View style={[styles.footer, { borderTopColor: colors.line }, collapsed ? styles.footerCollapsed : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
          onPress={toggle}
          style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.7 } : null]}
        >
          <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.inkSecondary} />
        </Pressable>
        {!collapsed ? (
          <View style={styles.userWrap}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent }}>{initials}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.userEmail, { color: colors.inkSecondary, fontFamily: fonts.body }]}>
              {user?.email}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => signOut()} hitSlop={8}>
              <Feather name="log-out" size={16} color={colors.inkSecondary} />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => signOut()} hitSlop={8}>
            <Feather name="log-out" size={18} color={colors.inkSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    borderRightWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  brand: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  newTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#4C5FD5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newTaskBtnCollapsed: {
    width: 44,
    alignSelf: "center",
  },
  newTaskText: {
    fontSize: 15,
  },
  nav: {
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  activePill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerCollapsed: {
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  userWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userEmail: {
    flex: 1,
    fontSize: 12,
  },
});
