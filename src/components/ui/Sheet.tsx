import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { elevation, fonts, radius } from "../../lib/theme";

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
 * panel; on narrow/mobile it becomes a bottom sheet. 180ms ease-out,
 * backdrop fades in with the panel. Respects reduced motion.
 */
export function Sheet({ open, onClose, title, subtitle, children, showCloseButton = true }: SheetProps) {
  const { colors } = useTheme();
  const isWide = Platform.OS === "web" && Dimensions.get("window").width >= WEB_BREAKPOINT;

  const [translate] = useState(() => new Animated.Value(isWide ? 420 : 600));
  const [panY] = useState(() => new Animated.Value(0));
  const [backdrop] = useState(() => new Animated.Value(0));
  const reducedMotion = useRef(false);
  const startY = useRef(0);
  const lastMoveY = useRef(0);
  const lastMoveTime = useRef(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reducedMotion.current = v));
  }, []);

  const snapBack = () => {
    Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 20 }).start();
  };

  const handleRelease = (dy: number, vy: number) => {
    if (dy > 100 || vy > 0.8) {
      const duration = reducedMotion.current ? 0 : 200;
      Animated.parallel([
        Animated.timing(translate, { toValue: 600, duration, useNativeDriver: true }),
        Animated.timing(panY, { toValue: 0, duration, useNativeDriver: true }),
      ]).start(() => onClose());
    } else {
      snapBack();
    }
  };

  useEffect(() => {
    if (open) {
      const duration = reducedMotion.current ? 0 : 180;
      Animated.timing(translate, { toValue: 0, duration, useNativeDriver: true }).start();
      Animated.timing(backdrop, { toValue: 1, duration, useNativeDriver: true }).start();
    } else {
      translate.setValue(isWide ? 420 : 600);
      panY.setValue(0);
      backdrop.setValue(0);
    }
  }, [open, translate, panY, backdrop, isWide]);

  if (!open) return null;

  const panelWidth = Math.min(Dimensions.get("window").width * 0.92, 400);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: backdrop }]}
      />
      <Pressable
        accessibilityLabel="Close panel"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[
          isWide ? styles.panelRight : styles.panelBottom,
          isWide ? { width: panelWidth } : null,
          {
            transform: [
              { translateY: isWide ? 0 : Animated.add(translate, panY) },
              { translateX: isWide ? translate : 0 },
            ],
          },
          { backgroundColor: colors.surface, borderColor: colors.line },
          { ...elevation(colors, "lg") },
        ]}
      >
        <View
          style={styles.grabberContainer}
          {...(Platform.OS !== "web"
            ? {
                onStartShouldSetResponder: (evt: GestureResponderEvent) => {
                  startY.current = evt.nativeEvent.pageY;
                  lastMoveY.current = evt.nativeEvent.pageY;
                  lastMoveTime.current = Date.now();
                  return true;
                },
                onResponderMove: (evt: GestureResponderEvent) => {
                  panY.setValue(Math.max(0, evt.nativeEvent.pageY - startY.current));
                  lastMoveY.current = evt.nativeEvent.pageY;
                  lastMoveTime.current = Date.now();
                },
                onResponderRelease: (evt: GestureResponderEvent) => {
                  const dy = evt.nativeEvent.pageY - startY.current;
                  const dt = Date.now() - lastMoveTime.current;
                  const vy = dt > 0 ? (evt.nativeEvent.pageY - lastMoveY.current) / dt : 0;
                  handleRelease(dy, vy);
                },
                onResponderTerminate: () => snapBack(),
              }
            : null)}
        >
          <View style={[styles.grabber, { backgroundColor: colors.lineStrong }]} />
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
                style={({ pressed }) => [styles.closeBtn, { borderColor: colors.line }, pressed ? { backgroundColor: colors.hover } : null]}
              >
                <Ionicons name="close" size={20} color={colors.inkSecondary} />
              </Pressable>
            ) : null}
          </View>
        )}
        <View style={styles.body}>
          {Platform.OS === "web" ? (
            children
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.kav}
            >
              {children}
            </KeyboardAvoidingView>
          )}
        </View>
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
  },
  panelBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: Platform.OS === "web" ? radius.xl : 24,
    borderTopRightRadius: Platform.OS === "web" ? radius.xl : 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  kav: {
    flex: 1,
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
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
});
