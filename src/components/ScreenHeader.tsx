import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.inkSecondary, fontFamily: fonts.body }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 8,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    flexShrink: 0,
  },
});
