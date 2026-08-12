import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
}

/** Wraps a (app) route: theme canvas, safe-area top, centered max-width content. */
export function Screen({ children, scroll = false }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = Platform.OS === "web" ? 0 : insets.top + 4;

  const content = (
    <View style={[styles.content, Platform.OS === "web" ? styles.contentWeb : null]}>
      {children}
      <View style={Platform.OS === "web" ? styles.bottomPadWeb : styles.bottomPad} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: padTop }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "web" ? 32 : 16,
    paddingTop: 16,
  },
  contentWeb: {
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomPad: {
    // Tall enough that the last task scrolls clear of the floating "+" FAB
    // (which sits ~96+inset above the screen bottom) on mobile.
    height: 130,
  },
  bottomPadWeb: {
    height: 96,
  },
});
