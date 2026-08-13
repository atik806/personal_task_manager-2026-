import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteTask, useProjects, useSaveTask, useTags, useTasks, useToggleTask } from "../../lib/query";
import { taskInsertFromPatch } from "../../lib/task-utils";
import { formatLongDate, isBeforeToday, todayKey } from "../../lib/dates";
import { fonts, radius } from "../../lib/theme";
import { tapHaptic } from "../../lib/haptics";
import type { TaskUpdate, TaskWithTags } from "../../lib/types";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { TaskList } from "../../components/TaskList";
import { TaskDetailSheet } from "../../components/TaskDetailSheet";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { EmptyState } from "../../components/ui/EmptyState";

type Filter = "all" | "overdue" | "upcoming" | "nodate";

export default function UpcomingScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<TaskWithTags | null>(null);

  const tasksQ = useTasks(user?.id);
  const projectsQ = useProjects(user?.id);
  const tagsQ = useTags(user?.id);
  const toggleTask = useToggleTask(user?.id ?? "");
  const saveTask = useSaveTask(user?.id ?? "");
  const deleteTask = useDeleteTask(user?.id ?? "");

  const projectsById = useMemo(
    () => Object.fromEntries((projectsQ.data ?? []).map((p) => [p.id, p])),
    [projectsQ.data]
  );

  const tk = todayKey();
  const { overdue, upcoming, noDate } = useMemo(() => {
    const open = (tasksQ.data ?? []).filter((t) => t.status !== "done");
    return {
      overdue: open.filter((t) => t.due_date && isBeforeToday(t.due_date)),
      upcoming: open.filter((t) => t.due_date && t.due_date >= tk),
      noDate: open.filter((t) => !t.due_date),
    };
  }, [tasksQ.data, tk]);

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, TaskWithTags[]>();
    const sorted = [...upcoming].sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string));
    for (const t of sorted) {
      const key = t.due_date as string;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [upcoming]);

  const handleSave = (patch: TaskUpdate, tagIds: string[]) => {
    if (!selected) return;
    saveTask.mutate({ input: taskInsertFromPatch(selected, patch), tagIds, id: selected.id });
    setSelected(null);
  };

  const empty = tasksQ.data?.length === 0;
  const noOpen = overdue.length + upcoming.length + noDate.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader
        title="Upcoming"
        subtitle="Everything with a due date"
        action={
          <Link href="/calendar" asChild accessibilityLabel="Open calendar">
            <Pressable
              accessibilityRole="button"
              onPress={tapHaptic}
              style={({ pressed, hovered }) => [
                styles.headerAction,
                { backgroundColor: colors.accentSoft },
                Platform.OS === "web" && hovered ? { backgroundColor: colors.hover } : null,
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <Ionicons name="calendar" size={20} color={colors.accent} />
            </Pressable>
          </Link>
        }
      />
      <View style={styles.filterRow}>
        <SegmentedControl<Filter>
          options={[
            { value: "all", label: "All" },
            { value: "overdue", label: "Overdue" },
            { value: "upcoming", label: "Scheduled" },
            { value: "nodate", label: "No date" },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {empty ? (
        <EmptyState icon="calendar" title="No tasks yet" message="Add a task with a due date and it will show up here." />
      ) : (
        <View style={styles.sections}>
          {filter === "all" && noOpen ? (
            <EmptyState
              icon="checkmark-circle"
              title="All caught up"
              message="No open tasks right now. Add one with a due date and it will show up here."
            />
          ) : null}

          {!noOpen && (filter === "all" || filter === "overdue") ? (
            overdue.length > 0 ? (
              <View>
                <Text style={[styles.dateHeader, { color: colors.danger, fontFamily: fonts.monoMedium }]}>
                  OVERDUE
                </Text>
                <TaskList
                  card
                  tasks={overdue}
                  showOverdueLabel={false}
                  projectsById={projectsById}
                  onPressTask={setSelected}
                  onToggleTask={(t) => toggleTask.mutate(t)}
                  onDeleteTask={(t) => deleteTask.mutate(t.id)}
                />
              </View>
            ) : null
          ) : null}

          {!noOpen && (filter === "all" || filter === "upcoming") ? (
            upcomingByDate.map(([date, list]) => (
              <View key={date}>
                <Text style={[styles.dateHeader, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
                  {formatLongDate(date).toUpperCase()}
                </Text>
                <TaskList
                  card
                  tasks={list}
                  projectsById={projectsById}
                  onPressTask={setSelected}
                  onToggleTask={(t) => toggleTask.mutate(t)}
                  onDeleteTask={(t) => deleteTask.mutate(t.id)}
                />
              </View>
            ))
          ) : null}

          {!noOpen && (filter === "all" || filter === "nodate") ? (
            noDate.length > 0 ? (
              <View>
                <Text style={[styles.dateHeader, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
                  NO DATE
                </Text>
                <TaskList
                  card
                  tasks={noDate}
                  projectsById={projectsById}
                  onPressTask={setSelected}
                  onToggleTask={(t) => toggleTask.mutate(t)}
                  onDeleteTask={(t) => deleteTask.mutate(t.id)}
                />
              </View>
            ) : null
          ) : null}

          {filter === "overdue" && overdue.length === 0 ? (
            <EmptyState icon="checkmark-circle" title="Nothing overdue" message="You're all caught up." />
          ) : null}
          {filter === "upcoming" && upcoming.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing scheduled" message="Add a due date to a task to schedule it." />
          ) : null}
          {filter === "nodate" && noDate.length === 0 ? (
            <EmptyState icon="file-tray" title="No undated tasks" message="Every task has a date. Impressive." />
          ) : null}
        </View>
      )}

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
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    marginBottom: 8,
  },
  sections: {
    gap: 8,
  },
  dateHeader: {
    fontSize: 11,
    letterSpacing: 1.1,
    paddingTop: 14,
    paddingBottom: 4,
    paddingLeft: 2,
  },
});
