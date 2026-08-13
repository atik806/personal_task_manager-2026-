import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { fonts } from "../lib/theme";
import { dayKey, parseTime, todayKey } from "../lib/dates";
import { priorityLabel } from "../lib/priority";
import type { Priority, ProjectRow, TagRow, TaskStatus, TaskUpdate, TaskWithTags } from "../lib/types";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Sheet } from "./ui/Sheet";
import { TextField } from "./ui/TextField";

interface Draft {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  status: TaskStatus;
  projectId: string | null;
  tagIds: string[];
  recurrenceRule: string;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  dueDate: "",
  dueTime: "",
  priority: "medium",
  status: "todo",
  projectId: null,
  tagIds: [],
  recurrenceRule: "",
};

interface TaskDetailSheetProps {
  task: TaskWithTags | null;
  projects: ProjectRow[];
  tags: TagRow[];
  onClose: () => void;
  onSave: (patch: TaskUpdate, tagIds: string[]) => void;
  onDelete: () => void;
  onToggle: () => void;
}

const TIME_PRESETS = ["09:00", "12:00", "17:00"];

export function TaskDetailSheet({
  task,
  projects,
  tags,
  onClose,
  onSave,
  onDelete,
  onToggle,
}: TaskDetailSheetProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [prevTask, setPrevTask] = useState<TaskWithTags | null>(task);

  if (task !== prevTask) {
    setPrevTask(task);
    if (task) {
      setDraft({
        title: task.title,
        description: task.description,
        dueDate: task.due_date ?? "",
        dueTime: task.due_time ?? "",
        priority: task.priority,
        status: task.status,
        projectId: task.project_id,
        tagIds: task.tags.map((t) => t.id),
        recurrenceRule: task.recurrence_rule ?? "",
      });
      setDateError(null);
      setTimeError(null);
    }
  }

  const selectedTags = useMemo(() => new Set(draft.tagIds), [draft.tagIds]);
  const done = draft.status === "done";

  // Recompute each render so the presets stay correct across midnight.
  const datePresets = [
    { label: "Today", value: todayKey() },
    { label: "Tomorrow", value: dayKey(1) },
    { label: "+1wk", value: dayKey(7) },
  ];

  if (!task) return null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleTag = (id: string) => {
    set("tagIds", draft.tagIds.includes(id) ? draft.tagIds.filter((t) => t !== id) : [...draft.tagIds, id]);
  };

  // Optimistically flip the draft's status so the Complete/Reopen button and
  // Status control reflect the toggle immediately; the parent's onToggle
  // mutates the underlying task.
  const handleToggle = () => {
    set("status", done ? "todo" : "done");
    onToggle();
  };

  const handleSave = () => {
    const title = draft.title.trim();
    if (!title) return;

    let dueDate = draft.dueDate.trim();
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setDateError("Use YYYY-MM-DD");
      return;
    }
    setDateError(null);

    let dueTime = draft.dueTime.trim();
    if (dueTime) {
      const parsed = parseTime(dueTime);
      if (!parsed) {
        setTimeError("e.g. 17:30 or 5:30pm");
        return;
      }
      dueTime = parsed;
    }
    setTimeError(null);

    const patch: TaskUpdate = {
      title,
      description: draft.description.trim(),
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority: draft.priority,
      status: draft.status,
      project_id: draft.projectId,
      recurrence_rule: draft.recurrenceRule.trim() || null,
    };
    onSave(patch, draft.tagIds);
  };

  const subtitle = [
    draft.dueDate ? draft.dueDate : null,
    draft.dueTime ? draft.dueTime : null,
    priorityLabel(draft.priority),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Sheet open title={draft.title || "Task"} subtitle={subtitle} onClose={onClose} showCloseButton>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Title"
          value={draft.title}
          onChangeText={(v) => set("title", v)}
          placeholder="What needs doing?"
        />

        <TextField
          label="Notes"
          value={draft.description}
          onChangeText={(v) => set("description", v)}
          placeholder="Optional details…"
          multiline
          inputStyle={{ minHeight: 72, textAlignVertical: "top" }}
        />

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Due date</Text>
          <TextField
            value={draft.dueDate}
            onChangeText={(v) => set("dueDate", v)}
            placeholder="YYYY-MM-DD"
            error={dateError}
            inputStyle={{ fontFamily: fonts.mono }}
          />
          <View style={styles.chipRow}>
            {datePresets.map((p) => (
              <Chip
                key={p.value}
                label={p.label}
                color={colors.accent}
                dot={false}
                selected={draft.dueDate === p.value}
                onPress={() => set("dueDate", draft.dueDate === p.value ? "" : p.value)}
              />
            ))}
            {draft.dueDate ? (
              <Chip label="Clear" dot={false} onPress={() => set("dueDate", "")} />
            ) : null}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Time</Text>
          <TextField
            value={draft.dueTime}
            onChangeText={(v) => set("dueTime", v)}
            placeholder="HH:MM"
            error={timeError}
            inputStyle={{ fontFamily: fonts.mono }}
          />
          <View style={styles.chipRow}>
            {TIME_PRESETS.map((t) => (
              <Chip
                key={t}
                label={t}
                color={colors.accent}
                dot={false}
                selected={draft.dueTime === t}
                onPress={() => set("dueTime", draft.dueTime === t ? "" : t)}
              />
            ))}
            {draft.dueTime ? (
              <Chip label="Clear" dot={false} onPress={() => set("dueTime", "")} />
            ) : null}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Priority</Text>
          <SegmentedControl<Priority>
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Med" },
              { value: "high", label: "High" },
            ]}
            value={draft.priority}
            onChange={(v) => set("priority", v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Status</Text>
          <SegmentedControl<TaskStatus>
            options={[
              { value: "todo", label: "Todo" },
              { value: "in_progress", label: "Doing" },
              { value: "done", label: "Done" },
            ]}
            value={draft.status}
            onChange={(v) => set("status", v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Project</Text>
          <View style={styles.chipRow}>
            <Chip label="None" dot={false} selected={!draft.projectId} onPress={() => set("projectId", null)} />
            {projects
              .filter((p) => !p.archived)
              .map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  color={p.color}
                  selected={draft.projectId === p.id}
                  onPress={() => set("projectId", draft.projectId === p.id ? null : p.id)}
                />
              ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.inkSecondary }]}>Tags</Text>
          <View style={styles.chipRow}>
            {tags.map((t) => (
              <Chip
                key={t.id}
                label={`#${t.name}`}
                color={colors.accent}
                selected={selectedTags.has(t.id)}
                onPress={() => toggleTag(t.id)}
              />
            ))}
            {tags.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.inkSecondary }}>
                No tags yet — add them in Tags.
              </Text>
            ) : null}
          </View>
        </View>

        <TextField
          label="Repeat"
          value={draft.recurrenceRule}
          onChangeText={(v) => set("recurrenceRule", v)}
          placeholder='e.g. "daily", "weekly", "every 2 days"'
          hint="Daily, weekly, monthly, or custom intervals."
        />

        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <Button
            label={done ? "Reopen" : "Complete"}
            variant="secondary"
            icon={<Ionicons name={done ? "refresh" : "checkmark"} size={17} color={colors.success} />}
            onPress={handleToggle}
          />
          <Button
            label="Delete"
            variant="ghost"
            icon={<Ionicons name="trash" size={17} color={colors.danger} />}
            onPress={onDelete}
            accessibilityLabel="Delete task"
          />
        </View>

        <Button label="Save changes" onPress={handleSave} style={{ marginTop: 4 }} />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
