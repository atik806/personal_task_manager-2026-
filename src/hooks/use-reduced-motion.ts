import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Reactive "reduce motion" flag (false while undetermined). Animations can
 * check this to skip motion for users who prefer it.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    return () => {
      active = false;
    };
  }, []);

  return reduced;
}
