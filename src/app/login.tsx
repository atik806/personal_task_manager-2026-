import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Link } from "expo-router";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { signIn } from "../lib/supabase";
import { fonts } from "../lib/theme";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";

export default function LoginScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect href="/" />;

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // session change in AuthProvider triggers redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Text style={[styles.title, { color: colors.ink, fontFamily: fonts.displayBold }]}>Welcome back</Text>
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
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={handleSubmit}
      />
      {error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger }}>{error}</Text> : null}
      <Button label="Sign in" onPress={handleSubmit} loading={loading} />
      <View style={styles.links}>
        <Link href="/signup" style={[styles.link, { color: colors.accent }]}>
          Create an account
        </Link>
        <Link href="/reset-password" style={[styles.link, { color: colors.inkSecondary }]}>
          Forgot password?
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
