import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { formatTimeHHMM, isBeforeToday, todayKey } from "../lib/dates";
import type { ProjectRow, TaskWithTags } from "../lib/types";
import { fonts } from "../lib/theme";
import { Checkbox } from "./ui/Checkbox";
import { SpineNode, type SpineNodeColor } from "./DaySpine";

export function taskSpineKind(task: Pick<TaskWithTags, "status" | "due_date">): SpineNodeColor {
  if (task.status === "done") return "done";
  if (task.due_date && isBeforeToday(task.due_date) && task.due_date !== todayKey()) return "overdue";
  return "pending";
}

export function isTaskOverdue(task: Pick<TaskWithTags, "status" | "due_date">): boolean {
  return taskSpineKind(task) === "overdue";
}

interface TaskItemProps {
  task: TaskWithTags;
  project?: ProjectRow | null;
  onPress: () => void;
  onToggle: () => void;
  showTime?: boolean;
  showOverdueLabel?: boolean;
}

export function TaskItem({ task, project, onPress, onToggle, showTime = true, showOverdueLabel = true }: TaskItemProps) {
  const { colors } = useTheme();
  const done = task.status === "done";
  const overdue = isTaskOverdue(task);
  const [anim] = useState(() => new Animated.Value(done ? 1 : 0));
  const prevStatus = useRef(task.status);

  useEffect(() => {
    if (prevStatus.current !== "done" && task.status === "done") {
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else if (task.status !== "done") {
      anim.setValue(0);
    }
    prevStatus.current = task.status;
  }, [task.status, anim]);

  return (
    <Animated.View
      style={{
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${task.due_time ? ` at ${formatTimeHHMM(task.due_time)}` : ""}`}
        style={({ pressed, hovered }) => [
          styles.row,
          done ? { backgroundColor: colors.successSoft } : null,
          (pressed || (Platform.OS === "web" && hovered)) && !done
            ? { backgroundColor: colors.hover }
            : null,
        ]}
      >
        <SpineNode kind={taskSpineKind(task)} />
        <View style={styles.content}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: colors.ink,
                fontFamily: fonts.bodyMedium,
                textDecorationLine: done ? "line-through" : "none",
                opacity: done ? 0.7 : 1,
              },
            ]}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {showTime && task.due_time ? (
              <View style={[styles.timeChip, { backgroundColor: colors.chipBg }]}>
                <Feather name="clock" size={10} color={colors.inkSecondary} />
                <Text style={[styles.timeText, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
                  {formatTimeHHMM(task.due_time)}
                </Text>
              </View>
            ) : null}
            {overdue && showOverdueLabel ? (
              <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
                <Feather name="alert-circle" size={11} color={colors.danger} />
                <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, color: colors.danger }}>
                  Overdue
                </Text>
              </View>
            ) : null}
            {task.priority === "high" && !done ? (
              <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
                <Feather name="flag" size={11} color={colors.danger} />
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.danger }}>
                  High
                </Text>
              </View>
            ) : null}
            {project ? (
              <View style={styles.metaGroup}>
                <View style={[styles.projectDot, { backgroundColor: project.color }]} />
                <Text numberOfLines={1} style={[styles.meta, { color: colors.inkSecondary, fontFamily: fonts.body }]}>
                  {project.name}
                </Text>
              </View>
            ) : null}
            {task.tags.length ? (
              <Text numberOfLines={1} style={[styles.meta, { color: colors.inkSecondary, fontFamily: fonts.body }]}>
                {task.tags.map((t) => `#${t.name}`).join(" ")}
              </Text>
            ) : null}
            {task.recurrence_rule ? (
              <View style={[styles.repeatChip, { backgroundColor: colors.chipBg }]}>
                <Feather name="repeat" size={11} color={colors.inkSecondary} />
              </View>
            ) : null}
          </View>
        </View>
        <Checkbox
          checked={done}
          successColor
          onPress={onToggle}
          accessibilityLabel={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingRight: 12,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    gap: 4,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
  },
  repeatChip: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 120,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
