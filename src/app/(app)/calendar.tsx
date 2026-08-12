import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteTask, useProjects, useSaveTask, useTags, useTasks, useToggleTask } from "../../lib/query";
import { taskInsertFromPatch } from "../../lib/task-utils";
import { addDays, formatLongDate, formatMonthYear, getWeekDates, toISODate } from "../../lib/dates";
import { fonts, radius } from "../../lib/theme";
import type { TaskUpdate, TaskWithTags } from "../../lib/types";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { CalendarGrid, type CalendarMode } from "../../components/CalendarGrid";
import { TaskDetailSheet } from "../../components/TaskDetailSheet";
import { SegmentedControl } from "../../components/ui/SegmentedControl";

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<TaskWithTags | null>(null);

  const tasksQ = useTasks(user?.id);
  const projectsQ = useProjects(user?.id);
  const tagsQ = useTags(user?.id);
  const toggleTask = useToggleTask(user?.id ?? "");
  const saveTask = useSaveTask(user?.id ?? "");
  const deleteTask = useDeleteTask(user?.id ?? "");

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskWithTags[]> = {};
    for (const t of tasksQ.data ?? []) {
      if (!t.due_date) continue;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    }
    return map;
  }, [tasksQ.data]);

  const subtitle = useMemo(() => {
    if (mode === "month") return formatMonthYear(anchor);
    const [first] = getWeekDates(anchor);
    return `Week of ${formatLongDate(toISODate(first))}`;
  }, [mode, anchor]);

  const goPrev = () => {
    setAnchor((a) =>
      mode === "month"
        ? new Date(a.getFullYear(), a.getMonth() - 1, 1)
        : addDays(a, -7)
    );
  };
  const goNext = () => {
    setAnchor((a) =>
      mode === "month"
        ? new Date(a.getFullYear(), a.getMonth() + 1, 1)
        : addDays(a, 7)
    );
  };
  const goToday = () => {
    const now = new Date();
    setAnchor(mode === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : now);
  };

  const handleSave = (patch: TaskUpdate, tagIds: string[]) => {
    if (!selected) return;
    saveTask.mutate({ input: taskInsertFromPatch(selected, patch), tagIds, id: selected.id });
    setSelected(null);
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Calendar" subtitle={subtitle} onBack={() => router.back()} />

      <View style={styles.controls}>
        <SegmentedControl<CalendarMode>
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <View style={styles.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            onPress={goPrev}
            style={({ pressed, hovered }) => [
              styles.arrowBtn,
              { borderColor: colors.line, backgroundColor: Platform.OS === "web" && hovered ? colors.hover : "transparent" },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.inkSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Today"
            onPress={goToday}
            style={({ pressed, hovered }) => [
              styles.arrowBtn,
              { borderColor: colors.line, backgroundColor: Platform.OS === "web" && hovered ? colors.hover : "transparent" },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.inkSecondary }}>Today</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            onPress={goNext}
            style={({ pressed, hovered }) => [
              styles.arrowBtn,
              { borderColor: colors.line, backgroundColor: Platform.OS === "web" && hovered ? colors.hover : "transparent" },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <CalendarGrid mode={mode} anchor={anchor} tasksByDate={tasksByDate} onPressTask={setSelected} />
      </View>

      <TaskDetailSheet
        task={selected}
        projects={projectsQ.data ?? []}
        tags={tagsQ.data ?? []}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        onDelete={() => {
          if (selected) {
            deleteTask.mutate(selected.id);
            setSelected(null);
          }
        }}
        onToggle={() => {
          if (selected) toggleTask.mutate(selected);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  arrows: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  arrowBtn: {
    minHeight: 32,
    minWidth: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
