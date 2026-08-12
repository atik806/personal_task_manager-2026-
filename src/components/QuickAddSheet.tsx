import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/use-theme";
import { fonts, radius } from "../lib/theme";
import { describeParsed, parseQuickAdd, type QuickAddResult } from "../lib/parse";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";
import { TextField } from "./ui/TextField";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onCreate: (result: QuickAddResult) => void;
}

const EXAMPLES = [
  "Review PR at 5pm #work @daymark",
  "Gym tomorrow 7am high",
  "Water plants every 3 days",
  "Call mom next monday 10:30",
];

export function QuickAddSheet({ open, onClose, onCreate }: QuickAddSheetProps) {
  const { colors } = useTheme();
  const [input, setInput] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setInput("");
  }

  const parsed = parseQuickAdd(input);
  const canAdd = parsed.title.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onCreate(parsed);
    setInput("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="New task" subtitle="Smart parse: @project #tags 5pm tomorrow !!" showCloseButton>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Describe the task"
          value={input}
          onChangeText={setInput}
          placeholder="e.g. Review PR at 5pm #work tomorrow"
          autoFocus
        />

        {canAdd ? (
          <View style={[styles.preview, { backgroundColor: colors.accentSoft }]}>
            <View style={styles.previewRow}>
              <Ionicons name="text" size={14} color={colors.accent} />
              <Text style={[styles.previewTitle, { color: colors.ink, fontFamily: fonts.bodyMedium }]}>
                {parsed.title}
              </Text>
            </View>
            {describeParsed(parsed) ? (
              <Text style={[styles.previewMeta, { color: colors.inkSecondary, fontFamily: fonts.mono }]}>
                {describeParsed(parsed)}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Button label="Add task" onPress={handleAdd} disabled={!canAdd} style={{ marginTop: 4 }} />

        <View style={styles.examples}>
          <Text style={[styles.examplesLabel, { color: colors.inkSecondary }]}>Try:</Text>
          {EXAMPLES.map((ex) => (
            <Pressable
              key={ex}
              accessibilityRole="button"
              onPress={() => setInput(ex)}
              style={({ pressed, hovered }) => [
                styles.exampleRow,
                Platform.OS === "web" && hovered ? { backgroundColor: colors.hover } : null,
                pressed ? { opacity: 0.6 } : null,
              ]}
            >
              <Text style={[styles.example, { color: colors.accent, fontFamily: fonts.mono }]}>{ex}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 24,
  },
  preview: {
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 15,
  },
  previewMeta: {
    fontSize: 12,
  },
  examples: {
    gap: 4,
    marginTop: 4,
  },
  examplesLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: 2,
  },
  exampleRow: {
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  example: {
    fontSize: 13,
    lineHeight: 20,
  },
});
