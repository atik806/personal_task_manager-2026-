import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../hooks/use-theme";
import { fonts, radius } from "../lib/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}

export function ScreenHeader({ title, subtitle, action, onBack }: ScreenHeaderProps) {
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
              style={[styles.accentBar, { shadowColor: colors.accent }]}
            />
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={onBack}
                style={({ pressed, hovered }) => [
                  styles.backBtn,
                  { borderColor: colors.line },
                  Platform.OS === "web" && hovered ? { backgroundColor: colors.hover } : null,
                  pressed ? { transform: [{ scale: 0.92 }], opacity: 0.7 } : null,
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
            ) : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Text
            style={[
              styles.title,
              Platform.OS === "web" ? styles.titleWeb : styles.titleNative,
              { color: colors.ink, fontFamily: fonts.displayBold },
            ]}
          >
            {title}
          </Text>
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
    paddingBottom: 16,
  },
  titleWrap: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  accentBar: {
    width: 22,
    height: 3,
    borderRadius: 2,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  title: {
    letterSpacing: -1.2,
  },
  titleWeb: {
    fontSize: 36,
    lineHeight: 42,
  },
  titleNative: {
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    flexShrink: 0,
    paddingBottom: 2,
  },
  hairline: {
    height: 1,
    marginBottom: 12,
  },
});
