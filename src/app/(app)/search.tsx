import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteTask, useProjects, useSaveTask, useTags, useTasks, useToggleTask } from "../../lib/query";
import { taskInsertFromPatch } from "../../lib/task-utils";
import { fonts } from "../../lib/theme";
import type { TaskUpdate, TaskWithTags } from "../../lib/types";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { TaskList } from "../../components/TaskList";
import { TaskDetailSheet } from "../../components/TaskDetailSheet";
import { TextField } from "../../components/ui/TextField";
import { EmptyState } from "../../components/ui/EmptyState";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
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

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return (tasksQ.data ?? []).filter((t) => {
      if (normalize(t.title).includes(q)) return true;
      if (normalize(t.description).includes(q)) return true;
      if (t.tags.some((tag) => normalize(tag.name).includes(q))) return true;
      const project = t.project_id ? projectsById[t.project_id] : undefined;
      if (project && normalize(project.name).includes(q)) return true;
      return false;
    });
  }, [query, tasksQ.data, projectsById]);

  const handleSave = (patch: TaskUpdate, tagIds: string[]) => {
    if (!selected) return;
    saveTask.mutate({ input: taskInsertFromPatch(selected, patch), tagIds, id: selected.id });
    setSelected(null);
  };

  const showResults = normalize(query).length > 0;

  return (
    <Screen>
      <ScreenHeader title="Search" subtitle="Find any task, tag, or project" />
      <View style={styles.searchRow}>
        <View style={styles.searchIcon}>
          <Feather name="search" size={16} color={colors.inkSecondary} />
        </View>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks, tags, projects…"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.field}
        />
        {query ? (
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.inkSecondary }}>
            {results.length}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: 12 }}>
        {!showResults ? (
          <EmptyState icon="search" title="Type to search" message="Matches titles, notes, tags, and project names." />
        ) : results.length === 0 ? (
          <EmptyState icon="inbox" title="No matches" message={`Nothing matched "${query}". Try a different term.`} />
        ) : (
          <TaskList
            tasks={results}
            projectsById={projectsById}
            grouped={false}
            onPressTask={setSelected}
            onToggleTask={(t) => toggleTask.mutate(t)}
          />
        )}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchIcon: {
    width: 20,
    alignItems: "center",
  },
  field: {
    flex: 1,
  },
});
