import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { fonts, radius } from "../../lib/theme";

const WEB_BREAKPOINT = 1024;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** web: slide in from the right; native: bottom sheet */
  children: React.ReactNode;
  showCloseButton?: boolean;
}

/**
 * Overlay panel. On web ≥1024px it slides in from the right as a detail
 * panel; on narrow/mobile it becomes a bottom sheet. 180ms ease-out.
 */
export function Sheet({ open, onClose, title, subtitle, children, showCloseButton = true }: SheetProps) {
  const { colors, isDark } = useTheme();
  const isWide = Platform.OS === "web" && Dimensions.get("window").width >= WEB_BREAKPOINT;

  const [translate] = useState(() => new Animated.Value(isWide ? 420 : 600));
  const reducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reducedMotion.current = v));
  }, []);

  useEffect(() => {
    if (open) {
      Animated.timing(translate, {
        toValue: 0,
        duration: reducedMotion.current ? 0 : 180,
        useNativeDriver: true,
      }).start();
    } else {
      translate.setValue(isWide ? 420 : 600);
    }
  }, [open, translate, isWide]);

  if (!open) return null;

  const panelWidth = Math.min(Dimensions.get("window").width * 0.92, 400);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Close panel"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(20,22,28,0.32)" }]}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[
          isWide ? styles.panelRight : styles.panelBottom,
          isWide ? { width: panelWidth } : null,
          { transform: [{ translateY: isWide ? 0 : translate }, { translateX: isWide ? translate : 0 }] },
          { backgroundColor: colors.surface, borderColor: colors.line },
        ]}
      >
        <View style={styles.grabberContainer}>
          <View style={[styles.grabber, { backgroundColor: colors.line }]} />
        </View>
        {(title || subtitle || showCloseButton) && (
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>
                {title ?? ""}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {showCloseButton ? (
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeBtn, { borderColor: colors.line }]}
              >
                <Feather name="x" size={18} color={colors.inkSecondary} />
              </Pressable>
            ) : null}
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panelRight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  panelBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  grabberContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 32,
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerText: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
});
