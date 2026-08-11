import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import * as Linking from "expo-linking";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { resetPassword, updatePassword, supabase } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";

interface RecoveryTokens {
  access_token: string;
  refresh_token: string;
}

/** Parse a Supabase recovery link ("#access_token=…&refresh_token=…&type=recovery"). */
function parseRecoveryUrl(url: string): RecoveryTokens | null {
  if (!url) return null;
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const fields = Object.fromEntries(
    hash.split("&").map((pair) => {
      const eq = pair.indexOf("=");
      return eq === -1 ? [pair, ""] : [pair.slice(0, eq), decodeURIComponent(pair.slice(eq + 1))];
    })
  );
  if (fields.access_token && fields.refresh_token) {
    return { access_token: fields.access_token, refresh_token: fields.refresh_token };
  }
  return null;
}

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [updated, setUpdated] = useState(false);

  // When the user taps the recovery link, the app opens with an access token
  // in the URL. Restore that session so updatePassword() has one to use.
  useEffect(() => {
    let active = true;
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const tokens = parseRecoveryUrl(url);
      if (!tokens) return;
      try {
        const { error } = await supabase.auth.setSession(tokens);
        if (error) throw error;
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to restore your reset session.");
        }
      }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const choosePassword = Boolean(session);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      setUpdated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (sent && !choosePassword) {
    return (
      <AuthLayout>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Check your inbox</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkSecondary, lineHeight: 20 }}>
          If an account exists for {email.trim().toLowerCase()}, a reset link is on its way. Open it on this device to
          be signed in, then choose a new password.
        </Text>
        <Link href="/login" style={[styles.link, { color: colors.inkSecondary }]}>
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  if (updated) {
    return (
      <AuthLayout>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Password updated</Text>
        <Link href="/login" style={[styles.link, { color: colors.accent }]}>
          Sign in with your new password
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>
        {choosePassword ? "Choose a new password" : "Reset password"}
      </Text>

      {!choosePassword ? (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
      ) : (
        <>
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="6+ characters"
            secureTextEntry
            autoComplete="new-password"
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={handleUpdate}
          />
        </>
      )}

      {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger }}>{error}</Text> : null}

      <Button
        label={choosePassword ? "Update password" : "Send reset link"}
        onPress={choosePassword ? handleUpdate : handleSend}
        loading={loading}
      />
      <Link href="/login" style={[styles.link, { color: colors.inkSecondary }]}>
        Back to sign in
      </Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
