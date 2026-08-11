import React from "react";
import { Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <View pointerEvents="none" style={styles.glows}>
        <View
          style={[
            styles.glowBlob,
            {
              backgroundColor: colors.accentSoft,
              shadowColor: colors.accent,
            },
          ]}
        />
        <View
          style={[
            styles.glowBlob2,
            {
              backgroundColor: colors.accentSoft,
              shadowColor: colors.accent,
            },
          ]}
        />
      </View>
      <View style={styles.center}>
        <View style={styles.brand}>
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.logo, { shadowColor: colors.accent }]}
          >
            <Feather name="sun" size={22} color={colors.onAccent} />
          </LinearGradient>
          <Text style={[styles.name, { color: colors.ink, fontFamily: fonts.displayBold }]}>Daymark</Text>
        </View>
        <Text style={[styles.tagline, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>
          Clarity under motion
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.shadowColor },
          ]}
        >
          {children}
        </View>
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
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ minHeight: "100vh" } as unknown as ViewStyle) : {}),
  },
  glows: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowBlob: {
    position: "absolute",
    top: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
    elevation: 0,
  },
  glowBlob2: {
    position: "absolute",
    bottom: -180,
    right: -140,
    width: 460,
    height: 460,
    borderRadius: 230,
    opacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 90,
    elevation: 0,
  },
  center: {
    width: "100%",
    maxWidth: 400,
    gap: 16,
    alignItems: "center",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  name: {
    fontSize: 28,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
});
