import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";
import { completionsByWeekday, currentStreak, isBeforeToday, todayKey } from "../lib/dates";
import type { TaskWithTags } from "../lib/types";

interface DashboardStatsProps {
  tasks: TaskWithTags[];
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const completedDates = tasks
      .filter((t) => t.status === "done" && t.completed_at)
      .map((t) => (t.completed_at as string).slice(0, 10));

    const week = completionsByWeekday(completedDates);
    const completedThisWeek = week.reduce((sum, d) => sum + d.count, 0);
    const streak = currentStreak(completedDates);

    const tk = todayKey();
    const open = tasks.filter((t) => t.status !== "done" && t.due_date);
    const overdue = open.filter((t) => isBeforeToday(t.due_date as string) && t.due_date !== tk).length;
    const upcoming = open.filter((t) => (t.due_date as string) >= tk).length;

    return { completedThisWeek, streak, overdue, upcoming };
  }, [tasks]);

  const items: { icon: keyof typeof Feather.glyphMap; label: string; value: string; tint: string }[] = [
    { icon: "check-circle", label: "Done this week", value: String(stats.completedThisWeek), tint: colors.success },
    { icon: "zap", label: "Streak", value: `${stats.streak}d`, tint: colors.accent },
    { icon: "clock", label: "Overdue", value: String(stats.overdue), tint: colors.danger },
    { icon: "calendar", label: "Upcoming", value: String(stats.upcoming), tint: colors.inkSecondary },
  ];

  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View key={it.label} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Feather name={it.icon} size={16} color={it.tint} />
          <Text style={[styles.value, { color: colors.ink, fontFamily: fonts.displayBold }]}>{it.value}</Text>
          <Text style={[styles.label, { color: colors.inkSecondary, fontFamily: fonts.body }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  value: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 12,
  },
});
