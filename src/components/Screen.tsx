import React, { useCallback, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { useReducedMotion } from "../hooks/use-reduced-motion";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
}

/** Wraps a (app) route: theme canvas, safe-area top, centered max-width content. */
export function Screen({ children, scroll = false }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padTop = Platform.OS === "web" ? 0 : insets.top + 4;
  const reduced = useReducedMotion();
  const [entrance] = useState(() => new Animated.Value(0));

  // Fade + rise on every focus (each navigation into the screen), so routes
  // enter gently instead of popping in. Skips for reduce-motion users.
  useFocusEffect(
    useCallback(() => {
      if (reduced) {
        entrance.setValue(1);
        return;
      }
      entrance.setValue(0);
      Animated.spring(entrance, {
        toValue: 1,
        speed: 26,
        bounciness: 3,
        useNativeDriver: true,
      }).start();
    }, [reduced, entrance])
  );

  const content = (
    <View style={[styles.content, Platform.OS === "web" ? styles.contentWeb : null]}>
      {children}
      <View style={Platform.OS === "web" ? styles.bottomPadWeb : styles.bottomPad} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: padTop }]}>
      <Animated.View
        style={[
          styles.anim,
          {
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            ],
          },
        ]}
      >
        {scroll ? (
          <KeyboardAvoidingView
            behavior={
              Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined
            }
            style={styles.kav}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {content}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  anim: {
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
  kav: {
    flex: 1,
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
