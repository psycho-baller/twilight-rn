import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { AppScreen, GlassCard, PrimaryButton, SectionTitle } from "@/components/ui";
import { getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

async function shareTextFile(filename: string, contents: string) {
  const file = new File(Paths.cache, filename);
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}

export default function DataManagementModal() {
  const [busy, setBusy] = useState(false);
  const appearance = useAppStore((state) => state.appearance);
  const exportCsv = useAppStore((state) => state.exportCsv);
  const exportMarkdown = useAppStore((state) => state.exportMarkdown);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const previewImport = useAppStore((state) => state.previewImport);
  const importBackup = useAppStore((state) => state.importBackup);
  const theme = getTheme(appearance);

  async function handleImport() {
    try {
      setBusy(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const json = await new File(result.assets[0].uri).text();
      const preview = await previewImport(json);
      Alert.alert(
        "Import Backup",
        [
          `Profiles: ${preview.profileCount} total, ${preview.newProfiles} new, ${preview.updatedProfiles} updated.`,
          `Sessions: ${preview.sessionCount} total, ${preview.newSessions} new, ${preview.updatedSessions} updated.`,
          preview.settingsChanges > 0 ? `Sleep settings changes: ${preview.settingsChanges}.` : "",
          preview.appearanceChanges > 0 ? `Appearance changes: ${preview.appearanceChanges}.` : "",
          preview.hasActiveSessionConflict ? "There is an active session conflict; the local active session remains authoritative." : "",
        ]
          .filter(Boolean)
          .join("\n"),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            onPress: () => {
              importBackup(json).catch((error: Error) => Alert.alert("Import failed", error.message));
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Data error", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport(type: "csv" | "markdown" | "backup") {
    try {
      setBusy(true);
      if (type === "csv") {
        await shareTextFile("twilight_sessions.csv", await exportCsv());
      } else if (type === "markdown") {
        await shareTextFile("twilight_sessions.md", await exportMarkdown());
      } else {
        await shareTextFile("twilight_backup.json", await exportBackup());
      }
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen>
      <SectionTitle title="Data Management" subtitle="CSV export, AI-friendly Markdown export, and full JSON backups." />
      <GlassCard>
        <View className="gap-3">
          <PrimaryButton title="Export CSV" subtle disabled={busy} onPress={() => void handleExport("csv")} />
          <PrimaryButton title="Export Markdown" subtle disabled={busy} onPress={() => void handleExport("markdown")} />
          <PrimaryButton title="Export Full Backup" subtle disabled={busy} onPress={() => void handleExport("backup")} />
          <PrimaryButton title="Import Backup" disabled={busy} onPress={() => void handleImport()} />
        </View>
      </GlassCard>
      <Text style={{ color: theme.textSecondary }} className="text-center text-sm leading-6">
        Full backups merge with current data and automatically create a pre-import backup first.
      </Text>
      <PrimaryButton title="Close" subtle onPress={() => router.back()} />
    </AppScreen>
  );
}
