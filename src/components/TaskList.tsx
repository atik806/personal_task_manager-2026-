import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";
import {
  SLOT_ORDER,
  compareTime,
  slotLabel,
  slotOfTime,
  type DaySlot,
} from "../lib/dates";
import type { ProjectRow, TaskWithTags } from "../lib/types";
import { TaskItem } from "./TaskItem";
import { EmptyState } from "./ui/EmptyState";

interface TaskListProps {
  tasks: TaskWithTags[];
  projectsById?: Record<string, ProjectRow>;
  /** When true, tasks are shown under Morning/Afternoon/Evening/No time headers. */
  grouped?: boolean;
  onPressTask: (task: TaskWithTags) => void;
  onToggleTask: (task: TaskWithTags) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  projectsById = {},
  grouped = true,
  onPressTask,
  onToggleTask,
  emptyTitle = "All clear",
  emptyMessage = "Nothing here yet. Add a task to get started.",
}: TaskListProps) {
  const { colors } = useTheme();

  const sections = useMemo(() => {
    if (!grouped) {
      const sorted = [...tasks].sort((a, b) => compareTime(a.due_time, b.due_time));
      return [{ slot: "none" as DaySlot, tasks: sorted }];
    }
    const buckets: Record<DaySlot, TaskWithTags[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      none: [],
    };
    for (const task of tasks) {
      buckets[slotOfTime(task.due_time)].push(task);
    }
    const sections = SLOT_ORDER.map((slot) => ({
      slot,
      tasks: buckets[slot].sort((a, b) => compareTime(a.due_time, b.due_time)),
    }));
    return sections.filter((s) => s.tasks.length > 0);
  }, [tasks, grouped]);

  if (tasks.length === 0) {
    return <EmptyState icon="check-circle" title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <View style={styles.container}>
      {sections.map(({ slot, tasks: sectionTasks }) => (
        <View key={slot} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.sectionTitle, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
              {slotLabel(slot)}
            </Text>
            <View style={[styles.sectionCountChip, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.sectionCount, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>
                {sectionTasks.length}
              </Text>
            </View>
          </View>
          {sectionTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              project={task.project_id ? projectsById[task.project_id] : undefined}
              onPress={() => onPressTask(task)}
              onToggle={() => onToggleTask(task)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  section: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 16,
    paddingBottom: 6,
    paddingLeft: 2,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionCountChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  sectionCount: {
    fontSize: 10,
  },
});
