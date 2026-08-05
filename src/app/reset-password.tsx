import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import { useTheme } from "../hooks/use-theme";
import { resetPassword, updatePassword } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [updated, setUpdated] = useState(false);

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

  if (sent) {
    return (
      <AuthLayout>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Check your inbox</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkSecondary, lineHeight: 20 }}>
          If an account exists for {email.trim().toLowerCase()}, a reset link is on its way. Open it on this device to
          be signed in, then choose a new password below.
        </Text>
        <Button label="Choose a new password" onPress={() => setSent(false)} variant="secondary" />
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
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Reset password</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
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
      {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger }}>{error}</Text> : null}
      <Button label="Send reset link" onPress={handleSend} loading={loading} />
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
