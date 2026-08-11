import React, { createContext, useCallback, useContext, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { ensureTag, insertProject, supabase } from "../lib/supabase";
import { useSaveTask } from "../lib/query";
import type { TaskInsert } from "../lib/types";
import type { QuickAddResult } from "../lib/parse";
import { QuickAddSheet } from "./QuickAddSheet";

const QuickAddContext = createContext<{ open: () => void }>({ open: () => {} });

export function useQuickAdd() {
  return useContext(QuickAddContext);
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const saveTask = useSaveTask(user?.id ?? "");

  const handleCreate = useCallback(
    async (result: QuickAddResult) => {
      if (!user) return;
      const tagIds: string[] = [];
      for (const name of result.tags) {
        try {
          tagIds.push(await ensureTag(user.id, name));
        } catch {
          // individual tag failures don't block the task
        }
      }

      let projectId: string | null = null;
      if (result.project) {
        try {
          // Resolve project by name (case-insensitive), create if not exists
          const { data: existing } = await supabase
            .from("projects")
            .select("id")
            .eq("user_id", user.id)
            .ilike("name", result.project)
            .maybeSingle();
          if (existing) {
            projectId = existing.id;
          } else {
            const created = await insertProject({ name: result.project, color: "#6366f1", archived: false });
            projectId = created.id;
          }
        } catch {
          // project resolution/creation failures don't block the task
        }
      }

      const input: TaskInsert = {
        title: result.title,
        description: "",
        project_id: projectId,
        due_date: result.dueDate,
        due_time: result.dueTime,
        priority: result.priority ?? "medium",
        status: "todo",
        position: 0,
        parent_task_id: null,
        recurrence_rule: result.recurrenceRule,
        completed_at: null,
      };
      saveTask.mutate({ input, tagIds });
    },
    [user, saveTask]
  );

  const openQuickAdd = useCallback(() => setOpen(true), []);

  return (
    <QuickAddContext.Provider value={{ open: openQuickAdd }}>
      {children}
      <QuickAddSheet open={open} onClose={() => setOpen(false)} onCreate={handleCreate} />
      {Platform.OS !== "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New task"
          onPress={openQuickAdd}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.accent },
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Feather name="plus" size={24} color={colors.onAccent} />
        </Pressable>
      ) : null}
    </QuickAddContext.Provider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
