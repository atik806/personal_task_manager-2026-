import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteTask, useProjects, useSaveTask, useTags, useTasks, useToggleTask } from "../../lib/query";
import { taskInsertFromPatch } from "../../lib/task-utils";
import { formatLongDate, isBeforeToday, todayKey } from "../../lib/dates";
import { fonts } from "../../lib/theme";
import type { TaskUpdate, TaskWithTags } from "../../lib/types";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { TaskList } from "../../components/TaskList";
import { TaskItem } from "../../components/TaskItem";
import { TaskDetailSheet } from "../../components/TaskDetailSheet";
import { DashboardStats } from "../../components/DashboardStats";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { useQuickAdd } from "../../components/QuickAddProvider";

export default function TodayScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
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
    <Screen>
      <ScreenHeader title="Today" subtitle={formatLongDate(tk)} />

      {width >= 1024 ? <DashboardStats tasks={tasks} /> : null}

      {overdue.length > 0 ? (
        <View style={[styles.overdueStrip, { backgroundColor: colors.dangerSoft }]}>
          <View style={styles.overdueHeader}>
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
        />
      ) : (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="sun"
            title="Nothing due today"
            message="Enjoy the calm. Overdue and scheduled tasks will show up here."
            action={
              <Button
                label="Add a task"
                icon={<Feather name="plus" size={16} color={colors.onAccent} />}
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
  overdueStrip: {
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    marginTop: 16,
  },
  overdueHeader: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  overdueLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
  },
});
