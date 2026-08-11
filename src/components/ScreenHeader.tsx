import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
    <View>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <View style={styles.eyebrow}>
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.inkSecondary, fontFamily: fonts.body }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>{title}</Text>
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <View style={[styles.hairline, { backgroundColor: colors.line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 10,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accentBar: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    flexShrink: 0,
    paddingBottom: 2,
  },
  hairline: {
    height: 1,
    marginBottom: 8,
  },
});
