import React, { createContext, useCallback, useContext, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";
import { useAuth } from "../hooks/use-auth";
import { ensureTag, insertProject, supabase } from "../lib/supabase";
import { invalidateTags, useSaveTask } from "../lib/query";
import { fonts, glow, radius } from "../lib/theme";
import { tapHaptic } from "../lib/haptics";
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
  const insets = useSafeAreaInsets();
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
      // ensureTag creates rows outside useCreateTag; invalidate so the Tags
      // screen reflects them immediately instead of after the 30s staleTime.
      if (tagIds.length) invalidateTags(user.id);

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
      {Platform.OS === "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New task"
          onPress={() => {
            tapHaptic();
            openQuickAdd();
          }}
          style={({ pressed, hovered }) => [
            styles.fabWeb,
            { ...glow(colors, "strong") },
            hovered && !pressed ? styles.fabWebLift : null,
            pressed ? { opacity: 0.85, transform: [{ scale: 0.96 }] } : null,
          ]}
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabWebGradient}
          >
            <Ionicons name="add" size={20} color={colors.onAccent} />
            <Text style={[styles.fabWebLabel, { color: colors.onAccent }]}>New task</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New task"
          onPress={() => {
            tapHaptic();
            openQuickAdd();
          }}
          style={({ pressed }) => [
            styles.fab,
            { bottom: 88 + insets.bottom, ...glow(colors, "strong") },
            pressed ? { opacity: 0.85, transform: [{ scale: 0.92 }] } : null,
          ]}
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={24} color={colors.onAccent} />
          </LinearGradient>
        </Pressable>
      )}
    </QuickAddContext.Provider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  fabWeb: {
    position: "absolute",
    right: 24,
    bottom: 24,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fabWebGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  fabWebLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  fabWebLift: {
    transform: [{ translateY: -2 }],
  },
});
