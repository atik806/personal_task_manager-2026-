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
import { TaskItem } from "../../components/TaskItem";
import { TaskDetailSheet } from "../../components/TaskDetailSheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { useQuickAdd } from "../../components/QuickAddProvider";

export default function TodayScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { open: openQuickAdd } = useQuickAdd();

  const tasksQ = useTasks(user?.id);
  const projectsQ = useProjects(user?.id);
  const tagsQ = useTags(user?.id);

  const toggleTask = useToggleTask(user?.id ?? "");
  const saveTask = useSaveTask(user?.id ?? "");
  const deleteTask = useDeleteTask(user?.id ?? "");

  const [selected, setSelected] = useState<TaskWithTags | null>(null);

  const tasks = useMemo(() => tasksQ.data ?? [], [tasksQ.data]);
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data]);
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  const tk = todayKey();
  const overdue = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== "done" && t.due_date && isBeforeToday(t.due_date) && t.due_date !== tk
      ),
    [tasks, tk]
  );
  const todayTasks = useMemo(() => tasks.filter((t) => t.due_date === tk), [tasks, tk]);

  const handleSave = (patch: TaskUpdate, tagIds: string[]) => {
    if (!selected) return;
    saveTask.mutate({ input: taskInsertFromPatch(selected, patch), tagIds, id: selected.id });
    setSelected(null);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteTask.mutate(selected.id);
    setSelected(null);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title="Today"
        subtitle={formatLongDate(tk)}
        action={
          <Link href="/search" asChild accessibilityLabel="Search tasks">
            <Pressable
              accessibilityRole="button"
              onPress={tapHaptic}
              style={({ pressed, hovered }) => [
                styles.headerAction,
                { borderColor: colors.line },
                Platform.OS === "web" && hovered ? { backgroundColor: colors.hover } : null,
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <Ionicons name="search" size={20} color={colors.inkSecondary} />
            </Pressable>
          </Link>
        }
      />

      {overdue.length > 0 ? (
        <View
          style={[
            styles.overdueCard,
            { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
          ]}
        >
          <View style={styles.overdueHeader}>
            <View style={[styles.overdueIcon, { backgroundColor: colors.danger }]}>
              <Ionicons name="alert-circle" size={14} color={colors.onAccent} />
            </View>
            <Text style={[styles.overdueLabel, { color: colors.danger, fontFamily: fonts.monoMedium }]}>
              OVERDUE · {overdue.length}
            </Text>
          </View>
          {overdue.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              project={task.project_id ? projectsById[task.project_id] : undefined}
              onPress={() => setSelected(task)}
              onToggle={() => toggleTask.mutate(task)}
              onDelete={() => deleteTask.mutate(task.id)}
              showOverdueLabel={false}
            />
          ))}
        </View>
      ) : null}

      {todayTasks.length > 0 ? (
        <TaskList
          tasks={todayTasks}
          projectsById={projectsById}
          onPressTask={setSelected}
          onToggleTask={(t) => toggleTask.mutate(t)}
          onDeleteTask={(t) => deleteTask.mutate(t.id)}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="sunny"
            title="Nothing due today."
            message="Enjoy the calm. Overdue and scheduled tasks will show up here."
            action={
              <Button
                label="Add a task"
                icon={<Ionicons name="add" size={16} color={colors.onAccent} />}
                onPress={openQuickAdd}
              />
            }
          />
        </View>
      )}

      <TaskDetailSheet
        task={selected}
        projects={projects}
        tags={tagsQ.data ?? []}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        onToggle={() => {
          if (selected) toggleTask.mutate(selected);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overdueCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
    marginTop: 16,
  },
  overdueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  overdueIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  overdueLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
  },
});
