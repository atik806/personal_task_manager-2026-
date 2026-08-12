import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useCreateTag, useDeleteTag, useTags, useTasks } from "../../lib/query";
import { fonts, radius } from "../../lib/theme";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { EmptyState } from "../../components/ui/EmptyState";

export default function TagsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const tagsQ = useTags(user?.id);
  const tasksQ = useTasks(user?.id);
  const createTag = useCreateTag(user?.id ?? "");
  const deleteTag = useDeleteTag(user?.id ?? "");

  const openCountByTag = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasksQ.data ?? []) {
      if (t.status === "done") continue;
      for (const tag of t.tags) {
        map.set(tag.id, (map.get(tag.id) ?? 0) + 1);
      }
    }
    return map;
  }, [tasksQ.data]);

  const tags = tagsQ.data ?? [];

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createTag.mutate(trimmed);
    setName("");
  };

  const handleDelete = (id: string) => {
    deleteTag.mutate(id);
    setConfirmDeleteId(null);
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Tags" subtitle="Categorize tasks with labels" onBack={() => router.back()} />

      <View style={[styles.newCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionLabel, { color: colors.inkSecondary }]}>New tag</Text>
        <View style={styles.createRow}>
          <View style={styles.field}>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="Tag name"
              onSubmitEditing={handleCreate}
              autoCapitalize="none"
            />
          </View>
          <Button label="Add" onPress={handleCreate} disabled={!name.trim()} accessibilityLabel="Create tag" />
        </View>
      </View>

      {tags.length === 0 ? (
        <EmptyState icon="pricetag" title="No tags yet" message="Tags label tasks across projects. Create one to start organizing." />
      ) : (
        <View style={styles.list}>
          {tags.map((tag) => {
            const armed = confirmDeleteId === tag.id;
            return (
              <View
                key={tag.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={[styles.hash, { backgroundColor: colors.accentSoft }]}>
                  <Text style={{ fontFamily: fonts.monoMedium, fontSize: 13, color: colors.accent }}>#</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemiBold,
                      fontSize: 15,
                      color: colors.ink,
                    }}
                    numberOfLines={1}
                  >
                    {tag.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSecondary }}>
                    {openCountByTag.get(tag.id) ?? 0} open
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={armed ? "Confirm delete tag" : "Delete tag"}
                  onPress={() => (armed ? handleDelete(tag.id) : setConfirmDeleteId(tag.id))}
                  hitSlop={8}
                  style={({ pressed, hovered }) => [
                    styles.iconBtn,
                    Platform.OS === "web" && hovered ? { backgroundColor: colors.dangerSoft } : null,
                    pressed ? { opacity: 0.6 } : null,
                  ]}
                >
                  {armed ? (
                    <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.danger }}>Sure?</Text>
                  ) : (
                    <Ionicons name="trash" size={17} color={colors.danger} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  field: {
    flex: 1,
  },
  list: {
    gap: 8,
    marginTop: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hash: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
