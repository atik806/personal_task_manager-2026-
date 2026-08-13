import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/use-theme";
import { fonts, radius, type ThemeColors } from "../lib/theme";
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

/** Period dot color: morning green, afternoon amber, evening violet, no-time muted. */
function slotColor(slot: DaySlot, colors: ThemeColors): string {
  switch (slot) {
    case "morning":
      return colors.success;
    case "afternoon":
      return colors.warning;
    case "evening":
      return colors.accent;
    default:
      return colors.inkMuted;
  }
}

interface TaskListProps {
  tasks: TaskWithTags[];
  projectsById?: Record<string, ProjectRow>;
  /** When true, tasks are shown under Morning/Afternoon/Evening/No time headers. */
  grouped?: boolean;
  /** When true, renders each task as a bordered card (violet time chip + checkbox). */
  card?: boolean;
  /** When false, hides the per-task "Overdue" badge (e.g. inside an OVERDUE group). */
  showOverdueLabel?: boolean;
  onPressTask: (task: TaskWithTags) => void;
  onToggleTask: (task: TaskWithTags) => void;
  onDeleteTask?: (task: TaskWithTags) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  projectsById = {},
  grouped = true,
  card = false,
  showOverdueLabel = true,
  onPressTask,
  onToggleTask,
  onDeleteTask,
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
    return <EmptyState icon="checkmark-circle" title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <View style={styles.container}>
      {sections.map(({ slot, tasks: sectionTasks }) => (
        <View key={slot} style={styles.section}>
          {grouped ? (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: slotColor(slot, colors) }]} />
              <Text style={[styles.sectionTitle, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
                {slotLabel(slot)}
              </Text>
              <View style={[styles.sectionCountChip, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.sectionCount, { color: colors.accent, fontFamily: fonts.monoMedium }]}>
                  {sectionTasks.length}
                </Text>
              </View>
            </View>
          ) : null}
          {sectionTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              card={card}
              showOverdueLabel={showOverdueLabel}
              project={task.project_id ? projectsById[task.project_id] : undefined}
              onPress={() => onPressTask(task)}
              onToggle={() => onToggleTask(task)}
              onDelete={() => onDeleteTask?.(task)}
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
    borderRadius: radius.xs,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionCountChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  sectionCount: {
    fontSize: 10,
  },
});
