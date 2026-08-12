import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SheetVisibilityValue {
  isSheetOpen: boolean;
  reportSheetOpen: (open: boolean) => void;
}

const SheetVisibilityContext = createContext<SheetVisibilityValue>({
  isSheetOpen: false,
  reportSheetOpen: () => {},
});

export function useSheetVisibility() {
  return useContext(SheetVisibilityContext);
}

/**
 * Tracks how many Sheets are currently open so floating UI (the NavMenu FAB
 * and the New-task FAB) can hide while any sheet covers them. Uses an open
 * count instead of a boolean so overlapping sheets (e.g. QuickAddSheet opened
 * over TaskDetailSheet) keep the count accurate.
 */
export function SheetVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const reportSheetOpen = useCallback((open: boolean) => {
    setCount((prev) => (open ? prev + 1 : Math.max(0, prev - 1)));
  }, []);

  const value = useMemo(
    () => ({ isSheetOpen: count > 0, reportSheetOpen }),
    [count, reportSheetOpen]
  );

  return <SheetVisibilityContext.Provider value={value}>{children}</SheetVisibilityContext.Provider>;
}
