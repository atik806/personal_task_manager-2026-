import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { elevation, fonts } from "../lib/theme";
import { completionsByWeekday, currentStreak, isBeforeToday, todayKey, toISODate } from "../lib/dates";
import type { TaskWithTags } from "../lib/types";

interface DashboardStatsProps {
  tasks: TaskWithTags[];
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const completedDates = tasks
      .filter((t) => t.status === "done" && t.completed_at)
      .map((t) => toISODate(new Date(t.completed_at as string)));

    const week = completionsByWeekday(completedDates);
    const completedThisWeek = week.reduce((sum, d) => sum + d.count, 0);
    const streak = currentStreak(completedDates);

    const tk = todayKey();
    const open = tasks.filter((t) => t.status !== "done" && t.due_date);
    const overdue = open.filter((t) => isBeforeToday(t.due_date as string) && t.due_date !== tk).length;
    const upcoming = open.filter((t) => (t.due_date as string) > tk).length;

    return { completedThisWeek, streak, overdue, upcoming };
  }, [tasks]);

  const items: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
    tint: string;
    soft: string;
  }[] = [
    { icon: "check-circle", label: "Done this week", value: String(stats.completedThisWeek), tint: colors.success, soft: colors.successSoft },
    { icon: "zap", label: "Streak", value: `${stats.streak}d`, tint: colors.accent, soft: colors.accentSoft },
    { icon: "clock", label: "Overdue", value: String(stats.overdue), tint: colors.danger, soft: colors.dangerSoft },
    { icon: "calendar", label: "Upcoming", value: String(stats.upcoming), tint: colors.inkSecondary, soft: colors.chipBg },
  ];

  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View
          key={it.label}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.line },
            { ...elevation(colors, "sm") },
          ]}
        >
          <View style={[styles.iconChip, { backgroundColor: it.soft }]}>
            <Feather name={it.icon} size={15} color={it.tint} />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.value, { color: colors.ink, fontFamily: fonts.displayBold }]}>{it.value}</Text>
            <Text style={[styles.label, { color: colors.inkSecondary, fontFamily: fonts.body }]}>{it.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  value: {
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
});
