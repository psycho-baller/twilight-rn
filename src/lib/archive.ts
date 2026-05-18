import { APP_VERSION, ARCHIVE_TYPE, CURRENT_ARCHIVE_SCHEMA_VERSION } from "@/lib/constants";
import {
  clearAllData,
  getAppState,
  getAppearance,
  getEmergencyState,
  getHydratedState,
  getProfiles,
  getSessions,
  getSleepSettings,
  makeProfile,
  setAppState,
  setAppearance,
  setDemoRestoreState,
  setEmergencyState,
  setSleepSettings,
  upsertProfile,
  upsertSession,
} from "@/lib/db";
import { parseJson, serializeJson } from "@/lib/format";
import type {
  ActivitySelectionSnapshot,
  AppearanceSettings,
  ArchivePayload,
  BlockedProfile,
  BlockedProfileSession,
  DataArchivePreview,
  SessionSnapshot,
} from "@/lib/types";

function encodeSelectedActivity(selectedActivity: ActivitySelectionSnapshot) {
  if (selectedActivity.iosRawSelection) {
    return parseJson<Record<string, unknown>>(selectedActivity.iosRawSelection, {});
  }

  return {
    applicationTokens: selectedActivity.packageNames.map((item) => ({ data: item })),
    categoryTokens: selectedActivity.categoryIds,
    includeEntireCategory: false,
    untokenizedApplicationIdentifiers: selectedActivity.packageNames,
    untokenizedCategoryIdentifiers: selectedActivity.categoryIds,
    untokenizedWebDomainIdentifiers: selectedActivity.webDomains,
    webDomainTokens: selectedActivity.webDomains,
    androidSelectionSnapshot: selectedActivity,
  };
}

function decodeSelectedActivity(raw: unknown): ActivitySelectionSnapshot {
  const value = (raw ?? {}) as Record<string, unknown>;
  const androidSnapshot = value.androidSelectionSnapshot as ActivitySelectionSnapshot | undefined;
  if (androidSnapshot) {
    return androidSnapshot;
  }

  const packageNames =
    (value.untokenizedApplicationIdentifiers as string[] | undefined) ??
    ((value.applicationTokens as { data?: string }[] | undefined)?.map((item) => item.data).filter(Boolean) as string[] | undefined) ??
    [];
  const categoryIds =
    (value.untokenizedCategoryIdentifiers as string[] | undefined) ??
    ((value.categoryTokens as string[] | undefined) ?? []);
  const webDomains =
    (value.untokenizedWebDomainIdentifiers as string[] | undefined) ??
    ((value.webDomainTokens as string[] | undefined) ?? []);

  return {
    packageNames,
    categoryIds,
    webDomains,
    iosRawSelection: serializeJson(value),
  };
}

function normalizeProfile(rawProfile: Record<string, unknown>): BlockedProfile {
  return makeProfile({
    id: String(rawProfile.id),
    name: String(rawProfile.name ?? "Sleep"),
    createdAt: String(rawProfile.createdAt ?? new Date().toISOString()),
    updatedAt: String(rawProfile.updatedAt ?? new Date().toISOString()),
    blockingStrategyId: (rawProfile.blockingStrategyId as BlockedProfile["blockingStrategyId"]) ?? "ManualBlockingStrategy",
    strategyData:
      typeof rawProfile.strategyData === "string"
        ? rawProfile.strategyData
        : rawProfile.strategyData
          ? serializeJson(rawProfile.strategyData)
          : null,
    order: Number(rawProfile.order ?? 0),
    enableLiveActivity: Boolean(rawProfile.enableLiveActivity ?? true),
    reminderTimeInSeconds:
      rawProfile.reminderTimeInSeconds == null ? null : Number(rawProfile.reminderTimeInSeconds),
    customReminderMessage: String(rawProfile.customReminderMessage ?? ""),
    enableBreaks: Boolean(rawProfile.enableBreaks ?? false),
    breakTimeInMinutes: Number(rawProfile.breakTimeInMinutes ?? 15),
    enableStrictMode: Boolean(rawProfile.enableStrictMode ?? false),
    enableAllowMode: Boolean(rawProfile.enableAllowMode ?? false),
    enableAllowModeDomains: Boolean(rawProfile.enableAllowModeDomains ?? false),
    enableSafariBlocking: Boolean(rawProfile.enableSafariBlocking ?? true),
    useSleepSchedule: Boolean(rawProfile.useSleepSchedule ?? false),
    physicalUnblockNFCTagId:
      rawProfile.physicalUnblockNFCTagId == null ? null : String(rawProfile.physicalUnblockNFCTagId),
    physicalUnblockQRCodeId:
      rawProfile.physicalUnblockQRCodeId == null ? null : String(rawProfile.physicalUnblockQRCodeId),
    domains: Array.isArray(rawProfile.domains) ? (rawProfile.domains as string[]) : [],
    schedule: rawProfile.schedule ? (rawProfile.schedule as BlockedProfile["schedule"]) : null,
    disableBackgroundStops: Boolean(rawProfile.disableBackgroundStops ?? false),
    selectedActivity: decodeSelectedActivity(rawProfile.selectedActivity),
  });
}

function normalizeSession(rawSession: Record<string, unknown>): BlockedProfileSession {
  return {
    id: String(rawSession.id),
    tag: String(rawSession.tag ?? "Manual Log"),
    blockedProfileId: String(rawSession.blockedProfileId),
    startTime: String(rawSession.startTime),
    endTime: rawSession.endTime == null ? null : String(rawSession.endTime),
    breakStartTime: rawSession.breakStartTime == null ? null : String(rawSession.breakStartTime),
    breakEndTime: rawSession.breakEndTime == null ? null : String(rawSession.breakEndTime),
    startTimeZoneIdentifier:
      rawSession.startTimeZoneIdentifier == null ? null : String(rawSession.startTimeZoneIdentifier),
    endTimeZoneIdentifier:
      rawSession.endTimeZoneIdentifier == null ? null : String(rawSession.endTimeZoneIdentifier),
    breakStartTimeZoneIdentifier:
      rawSession.breakStartTimeZoneIdentifier == null ? null : String(rawSession.breakStartTimeZoneIdentifier),
    breakEndTimeZoneIdentifier:
      rawSession.breakEndTimeZoneIdentifier == null ? null : String(rawSession.breakEndTimeZoneIdentifier),
    forceStarted: Boolean(rawSession.forceStarted ?? false),
    needsHealthKitSync: Boolean(rawSession.needsHealthKitSync ?? true),
    healthKitSyncVersion: Number(rawSession.healthKitSyncVersion ?? 2),
  };
}

function snapshotFromSession(session: BlockedProfileSession): SessionSnapshot {
  return {
    id: session.id,
    tag: session.tag,
    blockedProfileId: session.blockedProfileId,
    startTime: session.startTime,
    endTime: session.endTime,
    breakStartTime: session.breakStartTime,
    breakEndTime: session.breakEndTime,
    startTimeZoneIdentifier: session.startTimeZoneIdentifier,
    endTimeZoneIdentifier: session.endTimeZoneIdentifier,
    breakStartTimeZoneIdentifier: session.breakStartTimeZoneIdentifier,
    breakEndTimeZoneIdentifier: session.breakEndTimeZoneIdentifier,
    forceStarted: session.forceStarted,
  };
}

export async function exportArchiveJson() {
  const [profiles, sessions, sleepSettings, appearance] = await Promise.all([
    getProfiles(),
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
    profiles: profiles.map((profile) => ({
      ...profile,
      selectedActivity: encodeSelectedActivity(profile.selectedActivity),
    })),
    sessions,
    sharedState: {
      activeSharedSession: sessions.find((session) => session.endTime == null)
        ? snapshotFromSession(sessions.find((session) => session.endTime == null)!)
        : null,
      completedScheduleSessions: [],
    },
  };

  return JSON.stringify(payload, null, 2);
}

export async function previewArchiveImport(payload: ArchivePayload): Promise<DataArchivePreview> {
  const current = await getHydratedState();
  const currentProfiles = new Map(current.profiles.map((profile) => [profile.id, serializeJson(profile)]));
  const currentSessions = new Map(current.sessions.map((session) => [session.id, serializeJson(session)]));

  let newProfiles = 0;
  let updatedProfiles = 0;
  for (const rawProfile of payload.profiles) {
    const normalized = normalizeProfile(rawProfile as Record<string, unknown>);
    const currentPayload = currentProfiles.get(normalized.id);
    if (!currentPayload) {
      newProfiles += 1;
    } else if (currentPayload !== serializeJson(normalized)) {
      updatedProfiles += 1;
    }
  }

  let newSessions = 0;
  let updatedSessions = 0;
  let incomingActiveModelSessions = 0;
  for (const rawSession of payload.sessions) {
    const normalized = normalizeSession(rawSession as Record<string, unknown>);
    if (normalized.endTime == null) incomingActiveModelSessions += 1;
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
    profileCount: payload.profiles.length,
    newProfiles,
    updatedProfiles,
    sessionCount: payload.sessions.length,
    newSessions,
    updatedSessions,
    settingsChanges,
    appearanceChanges,
    completedScheduleSessionChanges: payload.sharedState.completedScheduleSessions.length,
    hasIncomingActiveSharedSession: Boolean(payload.sharedState.activeSharedSession),
    hasActiveSessionConflict:
      current.sessions.some((session) => session.endTime == null) &&
      (incomingActiveModelSessions > 0 || Boolean(payload.sharedState.activeSharedSession)),
  };
}

export async function importArchivePayload(payload: ArchivePayload) {
  const backupArchiveJson = await exportArchiveJson();

  for (const rawProfile of payload.profiles) {
    await upsertProfile(normalizeProfile(rawProfile as Record<string, unknown>));
  }

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
  await setEmergencyState(await getEmergencyState());
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
  for (const rawProfile of payload.profiles) {
    await upsertProfile(normalizeProfile(rawProfile as Record<string, unknown>));
  }
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
