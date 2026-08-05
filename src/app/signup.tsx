import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { signUp } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";

export default function SignupScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (user) return <Redirect href="/" />;

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <View style={styles.sentWrap}>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Check your inbox</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.inkSecondary, lineHeight: 20 }}>
            We sent a confirmation link to {email.trim().toLowerCase()}. Click it to activate your account, then sign in.
          </Text>
          <Link href="/login" style={[styles.link, { color: colors.accent }]}>
            Back to sign in
          </Link>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Create your account</Text>
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
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="6+ characters"
            secureTextEntry
            autoComplete="new-password"
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger }}>{error}</Text> : null}
          <Button label="Create account" onPress={handleSubmit} loading={loading} />
          <Link href="/login" style={[styles.link, { color: colors.inkSecondary }]}>
            Already have an account? Sign in
          </Link>
        </>
      )}
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
  sentWrap: {
    gap: 12,
  },
});
