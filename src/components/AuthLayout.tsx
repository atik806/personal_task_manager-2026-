import React from "react";
import { Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <View style={styles.center}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.accent }]}>
            <Feather name="sun" size={22} color={colors.onAccent} />
          </View>
          <Text style={[styles.name, { color: colors.ink, fontFamily: fonts.displayBold }]}>Daymark</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    ...(Platform.OS === "web" ? ({ minHeight: "100vh" } as unknown as ViewStyle) : {}),
  },
  center: {
    width: "100%",
    maxWidth: 400,
    gap: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 28,
    letterSpacing: -0.8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
});
