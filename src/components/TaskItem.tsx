import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useTheme } from "../hooks/use-theme";
import { formatTimeHHMM, isBeforeToday, todayKey } from "../lib/dates";
import type { ProjectRow, TaskWithTags } from "../lib/types";
import { elevation, fonts, radius } from "../lib/theme";
import { completeHaptic, deleteHaptic } from "../lib/haptics";
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
  onDelete?: () => void;
  showTime?: boolean;
  showOverdueLabel?: boolean;
  /** Renders as a bordered card with shadow, violet time chip + violet checkbox. */
  card?: boolean;
}

export function TaskItem({
  task,
  project,
  onPress,
  onToggle,
  onDelete,
  showTime = true,
  showOverdueLabel = true,
  card = false,
}: TaskItemProps) {
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

  const handleToggle = () => {
    if (!done) completeHaptic();
    onToggle();
  };

  const handleComplete = () => {
    if (!done) completeHaptic();
    onToggle();
  };

  const row = (
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
          card
            ? [
                styles.rowCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  ...elevation(colors, "sm"),
                },
              ]
            : null,
          done ? { backgroundColor: colors.successSoft } : null,
          (pressed || (Platform.OS === "web" && hovered)) && !done
            ? { backgroundColor: card ? colors.accentSoft : colors.hover }
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
                fontFamily: card ? fonts.bodySemiBold : fonts.bodyMedium,
                textDecorationLine: done ? "line-through" : "none",
                opacity: done ? 0.7 : 1,
              },
            ]}
          >
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {showTime && task.due_time ? (
              <View
                style={[
                  styles.timeChip,
                  card ? { backgroundColor: colors.accentSoft } : { backgroundColor: colors.chipBg },
                ]}
              >
                <Ionicons name="time" size={12} color={card ? colors.accent : colors.inkSecondary} />
                <Text
                  style={[
                    styles.timeText,
                    { color: card ? colors.accent : colors.inkSecondary, fontFamily: fonts.monoMedium },
                  ]}
                >
                  {formatTimeHHMM(task.due_time)}
                </Text>
              </View>
            ) : null}
            {overdue && showOverdueLabel ? (
              <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="alert-circle" size={12} color={colors.danger} />
                <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, color: colors.danger }}>
                  Overdue
                </Text>
              </View>
            ) : null}
            {task.priority === "high" && !done ? (
              <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="flag" size={12} color={colors.danger} />
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
                <Ionicons name="repeat" size={12} color={colors.inkSecondary} />
              </View>
            ) : null}
          </View>
        </View>
        <Checkbox
          checked={done}
          successColor={!card}
          onPress={handleToggle}
          accessibilityLabel={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
        />
      </Pressable>
    </Animated.View>
  );

  if (Platform.OS === "web") return row;

  const renderDeleteActions = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete ${task.title}`}
      onPress={() => {
        onDelete?.();
        deleteHaptic();
      }}
      style={({ pressed }) => [
        styles.deleteAction,
        { backgroundColor: colors.danger },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Ionicons name="trash" size={20} color={colors.onAccent} />
    </Pressable>
  );

  const renderCompleteActions = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      onPress={handleComplete}
      style={({ pressed }) => [
        styles.completeAction,
        { backgroundColor: colors.success },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Ionicons name="checkmark" size={20} color={colors.onAccent} />
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      renderRightActions={onDelete ? renderDeleteActions : undefined}
      renderLeftActions={renderCompleteActions}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingRight: 12,
    borderRadius: radius.md,
  },
  rowCard: {
    marginVertical: 5,
    marginRight: 4,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
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
    borderRadius: radius.xs,
  },
  timeText: {
    fontSize: 11,
  },
  repeatChip: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
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
  deleteAction: {
    width: 72,
    margin: 4,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  completeAction: {
    width: 72,
    margin: 4,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
});
