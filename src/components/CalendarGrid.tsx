import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";
import { getMonthGrid, getWeekDates, toISODate, today } from "../lib/dates";
import type { TaskWithTags } from "../lib/types";

export type CalendarMode = "week" | "month";

interface CalendarGridProps {
  mode: CalendarMode;
  anchor: Date;
  tasksByDate: Record<string, TaskWithTags[]>;
  onPressTask: (task: TaskWithTags) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function taskDots(tasks: TaskWithTags[]): { color: string; done: boolean }[] {
  return tasks.slice(0, 3).map((t) => ({
    color: t.status === "done" ? "#34B27B" : t.priority === "high" ? "#FF6B5B" : "#4C5FD5",
    done: t.status === "done",
  }));
}

function DayCell({
  date,
  tasks,
  isToday,
  onPressTask,
}: {
  date: Date;
  tasks: TaskWithTags[];
  isToday: boolean;
  onPressTask: (task: TaskWithTags) => void;
}) {
  const { colors } = useTheme();
  const dots = taskDots(tasks);
  return (
    <View style={[styles.cell, { borderColor: colors.line }]}>
      <View style={styles.cellTop}>
        <View
          style={[
            styles.dayNum,
            isToday ? { backgroundColor: colors.accent } : null,
          ]}
        >
          <Text
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 13,
              color: isToday ? colors.onAccent : colors.ink,
            }}
          >
            {date.getDate()}
          </Text>
        </View>
      </View>
      <View style={styles.dots}>
        {dots.map((dot, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={tasks[i]?.title ?? "Task"}
            onPress={() => onPressTask(tasks[i])}
            hitSlop={6}
            style={({ pressed }) => [styles.taskDot, { backgroundColor: dot.color }, pressed ? { opacity: 0.5 } : null]}
          />
        ))}
      </View>
      {tasks.length > 3 ? (
        <Text style={[styles.more, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>+{tasks.length - 3}</Text>
      ) : null}
    </View>
  );
}

export function CalendarGrid({ mode, anchor, tasksByDate, onPressTask }: CalendarGridProps) {
  const { colors } = useTheme();
  const todayKey = toISODate(today());
  const monthGrid = getMonthGrid(anchor);

  return (
    <View>
      {mode === "week" ? (
        <View>
          <View style={styles.weekHeader}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={[styles.weekdayLabel, { color: colors.inkSecondary, fontFamily: fonts.monoMedium }]}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.weekRow}>
            {getWeekDates(anchor).map((d) => {
              const key = toISODate(d);
              return (
                <DayCell
                  key={key}
                  date={d}
                  tasks={tasksByDate[key] ?? []}
                  isToday={key === todayKey}
                  onPressTask={onPressTask}
                />
              );
            })}
          </View>
        </View>
      ) : (
        monthGrid.map((week, wi) => (
          <View key={wi} style={styles.monthRow}>
            {week.map((d) => {
              const key = toISODate(d);
              return (
                <DayCell
                  key={key}
                  date={d}
                  tasks={tasksByDate[key] ?? []}
                  isToday={key === todayKey}
                  onPressTask={onPressTask}
                />
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
  },
  monthRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    gap: 4,
  },
  cellTop: {
    alignItems: "center",
  },
  dayNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  more: {
    textAlign: "center",
    fontSize: 10,
  },
});
