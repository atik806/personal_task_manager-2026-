import React, { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/use-auth";
import { useTasks } from "../../lib/query";
import { updatePassword } from "../../lib/supabase";
import { downloadTextFile, exportStamp, tasksToCSV, tasksToJSON } from "../../lib/export";
import { fonts } from "../../lib/theme";
import { getRemindersEnabled, isReminderSupported, setRemindersEnabled } from "../../lib/notifications";
import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import type { ThemeMode } from "../../hooks/use-theme";

async function shareExportFile(filename: string, content: string, mimeType: string) {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: `Export ${filename}` });
  }
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const tasksQ = useTasks(user?.id);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getRemindersEnabled().then((enabled) => {
      if (active) setNotifEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const handlePwSubmit = async () => {
    setPwError(null);
    setPwMessage(null);
    if (pw.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pwConfirm) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      await updatePassword(pw);
      setPwMessage("Password updated.");
      setPw("");
      setPwConfirm("");
    } catch {
      setPwError("Could not update password. Check your session and try again.");
    } finally {
      setPwBusy(false);
    }
  };

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      const tasks = tasksQ.data ?? [];
      if (tasks.length === 0) return;
      const stamp = exportStamp();
      if (format === "csv") {
        const content = tasksToCSV(tasks);
        if (Platform.OS === "web") {
          downloadTextFile(`daymark-tasks-${stamp}.csv`, content, "text/csv");
        } else {
          await shareExportFile(`daymark-tasks-${stamp}.csv`, content, "text/csv");
        }
      } else {
        const content = tasksToJSON(tasks);
        if (Platform.OS === "web") {
          downloadTextFile(`daymark-tasks-${stamp}.json`, content, "application/json");
        } else {
          await shareExportFile(`daymark-tasks-${stamp}.json`, content, "application/json");
        }
      }
    },
    [tasksQ.data]
  );

  const handleToggleReminders = async (next: boolean) => {
    setNotifEnabled(next);
    await setRemindersEnabled(next);
    const { syncReminders } = await import("../../lib/notifications");
    await syncReminders(tasksQ.data ?? []);
  };

  const sectionLabel = (text: string) => (
    <Text style={[styles.sectionLabel, { color: colors.inkSecondary }]}>{text}</Text>
  );

  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Settings" subtitle="Appearance, reminders, and your data" />

      {sectionLabel("Appearance")}
      <View style={[styles.card, card]}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.ink }]}>Theme</Text>
            <Text style={[styles.settingSub, { color: colors.inkSecondary }]}>
              {mode === "system" ? "Follows your device" : mode === "dark" ? "Dark" : "Light"}
            </Text>
          </View>
          <View style={styles.segmentWrap}>
            <SegmentedControl<ThemeMode>
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        </View>
      </View>

      {sectionLabel("Reminders")}
      <View style={[styles.card, card]}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.ink }]}>Local reminders</Text>
            <Text style={[styles.settingSub, { color: colors.inkSecondary }]}>
              {isReminderSupported
                ? "Schedules a notification at each task's due time."
                : "Notifications are supported on iOS and Android."}
            </Text>
          </View>
          {isReminderSupported ? (
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleReminders}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor={Platform.OS === "android" ? colors.surface : undefined}
            />
          ) : null}
        </View>
      </View>

      {sectionLabel("Export")}
      <View style={[styles.card, card]}>
        <Text style={[styles.settingSub, { color: colors.inkSecondary, marginBottom: 12 }]}>
          Download all tasks as a file.
        </Text>
        <View style={styles.buttonRow}>
          <Button
            label="Export CSV"
            variant="secondary"
            icon={<Feather name="download" size={16} color={colors.ink} />}
            onPress={() => handleExport("csv")}
            disabled={(tasksQ.data?.length ?? 0) === 0}
          />
          <Button
            label="Export JSON"
            variant="secondary"
            icon={<Feather name="file-text" size={16} color={colors.ink} />}
            onPress={() => handleExport("json")}
            disabled={(tasksQ.data?.length ?? 0) === 0}
          />
        </View>
      </View>

      {sectionLabel("Account")}
      <View style={[styles.card, card]}>
        {user ? (
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.ink }]}>Signed in as</Text>
              <Text style={[styles.settingSub, { color: colors.inkSecondary }]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <Feather name="check-circle" size={18} color={colors.success} />
          </View>
        ) : null}
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <Text style={[styles.settingTitle, { color: colors.ink, marginBottom: 10 }]}>Change password</Text>
        <View style={{ gap: 10 }}>
          <TextField
            label="New password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            error={pwError}
          />
          <TextField
            label="Confirm new password"
            value={pwConfirm}
            onChangeText={setPwConfirm}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Repeat password"
          />
        </View>
        {pwMessage ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.success, marginTop: 8 }}>
            {pwMessage}
          </Text>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <Button label="Update password" onPress={handlePwSubmit} loading={pwBusy} />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <Text style={[styles.settingSub, { color: colors.inkSecondary, marginBottom: 12 }]}>
          Deleting your account is intentionally deferred — drop a note if you need it.
        </Text>
        <Button
          label="Sign out"
          variant="danger"
          icon={<Feather name="log-out" size={16} color="#FFFFFF" />}
          onPress={() => signOut()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  settingSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  segmentWrap: {
    flex: 1.4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});
