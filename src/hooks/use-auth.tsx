import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { onAuthChange, signOut as supabaseSignOut, supabase } from "../lib/supabase";
import { isReminderSupported } from "../lib/notifications";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    const { data: sub } = onAuthChange((_event, nextSession) => {
      if (!active) return;
      setSession((nextSession as Session) ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabaseSignOut();
    setSession(null);
    // Don't keep firing reminders for a signed-out user's tasks.
    if (isReminderSupported) {
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
