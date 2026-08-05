import React from "react";
import { Platform, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { BottomTabBar } from "../../components/BottomTabBar";
import { Sidebar } from "../../components/Sidebar";
import { QuickAddProvider } from "../../components/QuickAddProvider";
import { ReminderSync } from "../../components/ReminderSync";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: Platform.OS === "web" ? "row" : "column",
        backgroundColor: colors.canvas,
      }}
    >
      <ReminderSync />
      <QuickAddProvider>
        <Sidebar />
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          />
        </View>
        <BottomTabBar />
      </QuickAddProvider>
    </View>
  );
}
