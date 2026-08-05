import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useArchiveProject, useCreateProject, useDeleteProject, useProjects, useTasks } from "../../lib/query";
import { fonts } from "../../lib/theme";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { EmptyState } from "../../components/ui/EmptyState";

const PALETTE = [
  "#4C5FD5",
  "#34B27B",
  "#FF6B5B",
  "#F5A623",
  "#8E7CF0",
  "#2BB3C0",
  "#E25CB5",
  "#7A869A",
];

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const projectsQ = useProjects(user?.id);
  const tasksQ = useTasks(user?.id);
  const createProject = useCreateProject(user?.id ?? "");
  const archiveProject = useArchiveProject(user?.id ?? "");
  const deleteProject = useDeleteProject(user?.id ?? "");

  const countByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasksQ.data ?? []) {
      if (t.project_id && t.status !== "done") {
        map.set(t.project_id, (map.get(t.project_id) ?? 0) + 1);
      }
    }
    return map;
  }, [tasksQ.data]);

  const projects = projectsQ.data ?? [];
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProject.mutate({ name: trimmed, color, archived: false });
    setName("");
  };

  const renderProject = (p: { id: string; name: string; color: string; archived: boolean }) => (
    <View key={p.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.dot, { backgroundColor: p.archived ? colors.inkSecondary : p.color }]} />
      <View style={styles.cardBody}>
        <Text
          style={{
            fontFamily: fonts.bodySemiBold,
            fontSize: 15,
            color: p.archived ? colors.inkSecondary : colors.ink,
            textDecorationLine: p.archived ? "line-through" : "none",
          }}
        >
          {p.name}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSecondary }}>
          {countByProject.get(p.id) ?? 0} open
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.archived ? "Unarchive project" : "Archive project"}
        onPress={() => archiveProject.mutate({ id: p.id, archived: !p.archived })}
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.6 } : null]}
      >
        <Feather name={p.archived ? "rotate-ccw" : "archive"} size={16} color={colors.inkSecondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={confirmDeleteId === p.id ? "Confirm delete project" : "Delete project"}
        onPress={() => {
          if (confirmDeleteId === p.id) {
            deleteProject.mutate(p.id);
            setConfirmDeleteId(null);
          } else {
            setConfirmDeleteId(p.id);
          }
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, pressed ? { opacity: 0.6 } : null]}
      >
        {confirmDeleteId === p.id ? (
          <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.danger }}>Sure?</Text>
        ) : (
          <Feather name="trash-2" size={16} color={colors.danger} />
        )}
      </Pressable>
    </View>
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Projects" subtitle="Group tasks by context" />

      <View style={[styles.newCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionLabel, { color: colors.inkSecondary }]}>New project</Text>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Project name"
          onSubmitEditing={handleCreate}
        />
        <View style={styles.palette}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Color ${c}`}
              onPress={() => setColor(c)}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: c },
                color === c ? styles.swatchSelected : null,
                pressed ? { opacity: 0.7 } : null,
              ]}
            />
          ))}
        </View>
        <Button label="Create project" onPress={handleCreate} disabled={!name.trim()} />
      </View>

      {projects.length === 0 ? (
        <EmptyState icon="folder" title="No projects" message="Projects group related tasks. Create one to organize." />
      ) : (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.inkSecondary }]}>
              ACTIVE · {active.length}
            </Text>
            {archived.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => setShowArchived((v) => !v)} hitSlop={8}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent }}>
                  {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.list}>{active.map(renderProject)}</View>
          {showArchived && archived.length > 0 ? (
            <View style={styles.list}>{archived.map(renderProject)}</View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  newCard: {
    borderRadius: 16,
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
  palette: {
    flexDirection: "row",
    gap: 10,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 6,
  },
  list: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
