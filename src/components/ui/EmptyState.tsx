import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { fonts, glow, radius } from "../../lib/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.badgeWrap}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }, glow(colors, "soft")]}>
          <Ionicons name={icon} size={30} color={colors.accent} />
        </View>
        <View style={[styles.ring, { borderColor: colors.lineStrong }]} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.inkSecondary }]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = {
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 8,
  },
  badgeWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 116,
    height: 116,
    marginBottom: 14,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    borderWidth: 1,
    opacity: 0.4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
  },
  action: {
    marginTop: 14,
  },
} as const;
