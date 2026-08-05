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
    <View style={styles.content}>
      {children}
      <View style={styles.bottomPad} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomPad: {
    height: 96,
  },
});
