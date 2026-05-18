import { APP_VERSION, ARCHIVE_TYPE, CURRENT_ARCHIVE_SCHEMA_VERSION } from "@/lib/constants";
import {
  clearAllData,
  getAppState,
  getAppearance,
  getHydratedState,
  getSessions,
  getSleepSettings,
  setAppState,
  setAppearance,
  setDemoRestoreState,
  setSleepSettings,
  upsertSession,
} from "@/lib/db";
import { parseJson, serializeJson } from "@/lib/format";
import type {
  AppearanceSettings,
  ArchivePayload,
  SleepSession,
  DataArchivePreview,
} from "@/lib/types";

function normalizeSession(rawSession: Record<string, unknown>): SleepSession {
  return {
    id: String(rawSession.id),
    tag: String(rawSession.tag ?? "Manual Log"),
    startTime: String(rawSession.startTime),
    endTime: rawSession.endTime == null ? null : String(rawSession.endTime),
    startTimeZoneIdentifier:
      rawSession.startTimeZoneIdentifier == null ? null : String(rawSession.startTimeZoneIdentifier),
    endTimeZoneIdentifier:
      rawSession.endTimeZoneIdentifier == null ? null : String(rawSession.endTimeZoneIdentifier),
    needsHealthKitSync: Boolean(rawSession.needsHealthKitSync ?? true),
    healthKitSyncVersion: Number(rawSession.healthKitSyncVersion ?? 2),
  };
}

export async function exportArchiveJson() {
  const [sessions, sleepSettings, appearance] = await Promise.all([
    getSessions(),
    getSleepSettings(),
    getAppearance(),
  ]);

  const payload: ArchivePayload = {
    metadata: {
      archiveType: ARCHIVE_TYPE,
      schemaVersion: CURRENT_ARCHIVE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      timeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
      appVersion: APP_VERSION,
    },
    sleepSettings,
    appearance,
    sessions,
  };

  return JSON.stringify(payload, null, 2);
}

export async function previewArchiveImport(payload: ArchivePayload): Promise<DataArchivePreview> {
  const current = await getHydratedState();
  const currentSessions = new Map(current.sessions.map((session) => [session.id, serializeJson(session)]));

  let newSessions = 0;
  let updatedSessions = 0;
  for (const rawSession of payload.sessions) {
    const normalized = normalizeSession(rawSession as Record<string, unknown>);
    const currentPayload = currentSessions.get(normalized.id);
    if (!currentPayload) {
      newSessions += 1;
    } else if (currentPayload !== serializeJson(normalized)) {
      updatedSessions += 1;
    }
  }

  const settingsChanges = Number(serializeJson(current.sleepSettings) !== serializeJson(payload.sleepSettings));
  const appearanceChanges = Number(serializeJson(current.appearance) !== serializeJson(payload.appearance));

  return {
    exportedAt: payload.metadata.exportedAt,
    appVersion: payload.metadata.appVersion,
    sessionCount: payload.sessions.length,
    newSessions,
    updatedSessions,
    settingsChanges,
    appearanceChanges,
  };
}

export async function importArchivePayload(payload: ArchivePayload) {
  const backupArchiveJson = await exportArchiveJson();

  for (const rawSession of payload.sessions) {
    await upsertSession(normalizeSession(rawSession as Record<string, unknown>));
  }

  await setSleepSettings(payload.sleepSettings);
  await setAppearance({
    themeMode: payload.appearance.themeMode as AppearanceSettings["themeMode"],
    colorPalette: payload.appearance.colorPalette as AppearanceSettings["colorPalette"],
  });
  await setAppState({
    ...(await getAppState()),
    pendingExternalAction: null,
  });
  await setDemoRestoreState({
    backupArchiveJson,
    backupCreatedAt: new Date().toISOString(),
    isDemoActive: false,
  });

  return {
    preview: await previewArchiveImport(payload),
    automaticBackupJson: backupArchiveJson,
  };
}

export async function importArchiveJson(json: string) {
  const payload = parseJson<ArchivePayload | null>(json, null);
  if (!payload) {
    throw new Error("The selected file could not be parsed.");
  }
  if (payload.metadata?.archiveType !== ARCHIVE_TYPE) {
    throw new Error("This file is not a Twilight full backup.");
  }
  return importArchivePayload(payload);
}

export async function restoreFromBackupJson(json: string) {
  const payload = parseJson<ArchivePayload | null>(json, null);
  if (!payload) throw new Error("Restore backup was unreadable.");
  await clearAllData();
  for (const rawSession of payload.sessions) {
    await upsertSession(normalizeSession(rawSession as Record<string, unknown>));
  }
  await setSleepSettings(payload.sleepSettings);
  await setAppearance({
    themeMode: payload.appearance.themeMode as AppearanceSettings["themeMode"],
    colorPalette: payload.appearance.colorPalette as AppearanceSettings["colorPalette"],
  });
  await setDemoRestoreState({
    backupArchiveJson: null,
    backupCreatedAt: null,
    isDemoActive: false,
  });
}
