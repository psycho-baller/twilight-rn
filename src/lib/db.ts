import * as SQLite from "expo-sqlite";

import {
  APP_VERSION,
  CURRENT_ARCHIVE_SCHEMA_VERSION,
  DB_NAME,
  DEFAULT_APP_STATE,
  DEFAULT_APPEARANCE,
  DEFAULT_EMERGENCY_STATE,
  DEFAULT_SLEEP_SETTINGS,
} from "@/lib/constants";
import { parseJson, serializeJson } from "@/lib/format";
import type {
  ActivitySelectionSnapshot,
  AppearanceSettings,
  AppStateRecord,
  BlockedProfile,
  BlockedProfileSession,
  DemoRestoreState,
  EmergencyState,
  HydratedAppState,
  SleepSettings,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  payload: string;
};

type SessionRow = {
  id: string;
  payload: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DEFAULT_DEMO_RESTORE: DemoRestoreState = {
  backupArchiveJson: null,
  backupCreatedAt: null,
  isDemoActive: false,
};

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

async function setKeyValue(
  db: SQLite.SQLiteDatabase,
  table: string,
  key: string,
  value: string,
) {
  await db.runAsync(
    `INSERT INTO ${table} (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

async function getKeyValue<T>(
  db: SQLite.SQLiteDatabase,
  table: string,
  key: string,
  fallback: T,
) {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${table} WHERE key = ?`,
    [key],
  );
  return parseJson(row?.value ?? null, fallback);
}

async function seedKeyValueTable<T extends Record<string, unknown>>(
  db: SQLite.SQLiteDatabase,
  table: string,
  value: T,
) {
  for (const [key, entry] of Object.entries(value)) {
    const existing = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM ${table} WHERE key = ?`,
      [key],
    );
    if (!existing) {
      await setKeyValue(db, table, key, serializeJson(entry));
    }
  }
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      ordering INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      blocking_strategy_id TEXT,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      blocked_profile_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_order ON profiles(ordering, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(blocked_profile_id, start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(end_time);

    CREATE TABLE IF NOT EXISTS sleep_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appearance_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_restore_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  await seedKeyValueTable(db, "sleep_settings", DEFAULT_SLEEP_SETTINGS);
  await seedKeyValueTable(db, "appearance_settings", DEFAULT_APPEARANCE);
  await seedKeyValueTable(db, "emergency_state", DEFAULT_EMERGENCY_STATE);
  await seedKeyValueTable(db, "app_state", DEFAULT_APP_STATE);
  await seedKeyValueTable(db, "demo_restore_state", DEFAULT_DEMO_RESTORE);
  await setKeyValue(db, "app_state", "archiveSchemaVersion", serializeJson(CURRENT_ARCHIVE_SCHEMA_VERSION));
  await setKeyValue(db, "app_state", "appVersion", serializeJson(APP_VERSION));
}

export async function getDb() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }

  return databasePromise;
}

export function makeProfile(partial?: Partial<BlockedProfile>): BlockedProfile {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name: "Sleep",
    selectedActivity: {
      packageNames: [],
      categoryIds: [],
      webDomains: [],
      iosRawSelection: null,
    },
    createdAt: now,
    updatedAt: now,
    blockingStrategyId: "ManualBlockingStrategy",
    strategyData: null,
    order: 0,
    enableLiveActivity: true,
    reminderTimeInSeconds: null,
    customReminderMessage: "",
    enableBreaks: false,
    breakTimeInMinutes: 15,
    enableStrictMode: false,
    enableAllowMode: false,
    enableAllowModeDomains: false,
    enableSafariBlocking: true,
    useSleepSchedule: false,
    physicalUnblockNFCTagId: null,
    physicalUnblockQRCodeId: null,
    domains: [],
    schedule: {
      days: [],
      startHour: 22,
      startMinute: 0,
      endHour: 7,
      endMinute: 0,
      updatedAt: now,
    },
    disableBackgroundStops: false,
    ...partial,
  };
}

export function makeSession(
  blockedProfileId: string,
  tag: string,
  partial?: Partial<BlockedProfileSession>,
): BlockedProfileSession {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    tag,
    blockedProfileId,
    startTime: now,
    endTime: null,
    breakStartTime: null,
    breakEndTime: null,
    startTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
    endTimeZoneIdentifier: null,
    breakStartTimeZoneIdentifier: null,
    breakEndTimeZoneIdentifier: null,
    forceStarted: false,
    needsHealthKitSync: true,
    healthKitSyncVersion: 2,
    ...partial,
  };
}

export async function getProfiles() {
  const db = await getDb();
  const rows = await db.getAllAsync<ProfileRow>(
    "SELECT id, payload FROM profiles ORDER BY ordering ASC, updated_at DESC",
  );
  return rows.map((row) => parseJson<BlockedProfile>(row.payload, makeProfile({ id: row.id })));
}

export async function getSessions() {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    "SELECT id, payload FROM sessions ORDER BY start_time DESC",
  );
  return rows.map((row) =>
    parseJson<BlockedProfileSession>(row.payload, makeSession("", "Manual Log", { id: row.id })),
  );
}

export async function upsertProfile(profile: BlockedProfile) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profiles (id, name, ordering, updated_at, blocking_strategy_id, payload)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       ordering = excluded.ordering,
       updated_at = excluded.updated_at,
       blocking_strategy_id = excluded.blocking_strategy_id,
       payload = excluded.payload`,
    [
      profile.id,
      profile.name,
      profile.order,
      profile.updatedAt,
      profile.blockingStrategyId,
      serializeJson(profile),
    ],
  );
}

export async function deleteProfile(profileId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM sessions WHERE blocked_profile_id = ?", [profileId]);
  await db.runAsync("DELETE FROM profiles WHERE id = ?", [profileId]);
}

export async function upsertSession(session: BlockedProfileSession) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sessions (id, blocked_profile_id, start_time, end_time, payload)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       blocked_profile_id = excluded.blocked_profile_id,
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       payload = excluded.payload`,
    [
      session.id,
      session.blockedProfileId,
      session.startTime,
      session.endTime,
      serializeJson(session),
    ],
  );
}

export async function deleteSession(sessionId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export async function getSleepSettings(): Promise<SleepSettings> {
  const db = await getDb();
  return {
    isOnboarded: await getKeyValue(db, "sleep_settings", "isOnboarded", DEFAULT_SLEEP_SETTINGS.isOnboarded),
    optimalSleepMinutes: await getKeyValue(
      db,
      "sleep_settings",
      "optimalSleepMinutes",
      DEFAULT_SLEEP_SETTINGS.optimalSleepMinutes,
    ),
    optimalWakeMinutes: await getKeyValue(
      db,
      "sleep_settings",
      "optimalWakeMinutes",
      DEFAULT_SLEEP_SETTINGS.optimalWakeMinutes,
    ),
    sleepProfileId: await getKeyValue(db, "sleep_settings", "sleepProfileId", DEFAULT_SLEEP_SETTINGS.sleepProfileId),
    windDownReminderEnabled: await getKeyValue(
      db,
      "sleep_settings",
      "windDownReminderEnabled",
      DEFAULT_SLEEP_SETTINGS.windDownReminderEnabled,
    ),
    healthSyncEnabled: await getKeyValue(
      db,
      "sleep_settings",
      "healthSyncEnabled",
      DEFAULT_SLEEP_SETTINGS.healthSyncEnabled,
    ),
  };
}

export async function setSleepSettings(partial: Partial<SleepSettings>) {
  const db = await getDb();
  const merged = { ...(await getSleepSettings()), ...partial };
  for (const [key, value] of Object.entries(merged)) {
    await setKeyValue(db, "sleep_settings", key, serializeJson(value));
  }
  return merged;
}

export async function getAppearance(): Promise<AppearanceSettings> {
  const db = await getDb();
  return {
    themeMode: await getKeyValue(db, "appearance_settings", "themeMode", DEFAULT_APPEARANCE.themeMode),
    colorPalette: await getKeyValue(
      db,
      "appearance_settings",
      "colorPalette",
      DEFAULT_APPEARANCE.colorPalette,
    ),
  };
}

export async function setAppearance(partial: Partial<AppearanceSettings>) {
  const db = await getDb();
  const merged = { ...(await getAppearance()), ...partial };
  for (const [key, value] of Object.entries(merged)) {
    await setKeyValue(db, "appearance_settings", key, serializeJson(value));
  }
  return merged;
}

export async function getEmergencyState(): Promise<EmergencyState> {
  const db = await getDb();
  return {
    emergencyUnblocksRemaining: await getKeyValue(
      db,
      "emergency_state",
      "emergencyUnblocksRemaining",
      DEFAULT_EMERGENCY_STATE.emergencyUnblocksRemaining,
    ),
    emergencyUnblocksResetPeriodInWeeks: await getKeyValue(
      db,
      "emergency_state",
      "emergencyUnblocksResetPeriodInWeeks",
      DEFAULT_EMERGENCY_STATE.emergencyUnblocksResetPeriodInWeeks,
    ),
    lastEmergencyUnblocksResetDateTimestamp: await getKeyValue(
      db,
      "emergency_state",
      "lastEmergencyUnblocksResetDateTimestamp",
      DEFAULT_EMERGENCY_STATE.lastEmergencyUnblocksResetDateTimestamp,
    ),
  };
}

export async function setEmergencyState(partial: Partial<EmergencyState>) {
  const db = await getDb();
  const merged = { ...(await getEmergencyState()), ...partial };
  for (const [key, value] of Object.entries(merged)) {
    await setKeyValue(db, "emergency_state", key, serializeJson(value));
  }
  return merged;
}

export async function getAppState(): Promise<AppStateRecord> {
  const db = await getDb();
  return {
    pendingExternalAction: await getKeyValue(
      db,
      "app_state",
      "pendingExternalAction",
      DEFAULT_APP_STATE.pendingExternalAction,
    ),
    lastViewedTab: await getKeyValue(db, "app_state", "lastViewedTab", DEFAULT_APP_STATE.lastViewedTab),
  };
}

export async function setAppState(partial: Partial<AppStateRecord>) {
  const db = await getDb();
  const merged = { ...(await getAppState()), ...partial };
  for (const [key, value] of Object.entries(merged)) {
    await setKeyValue(db, "app_state", key, serializeJson(value));
  }
  return merged;
}

export async function getDemoRestoreState(): Promise<DemoRestoreState> {
  const db = await getDb();
  return {
    backupArchiveJson: await getKeyValue(
      db,
      "demo_restore_state",
      "backupArchiveJson",
      DEFAULT_DEMO_RESTORE.backupArchiveJson,
    ),
    backupCreatedAt: await getKeyValue(
      db,
      "demo_restore_state",
      "backupCreatedAt",
      DEFAULT_DEMO_RESTORE.backupCreatedAt,
    ),
    isDemoActive: await getKeyValue(
      db,
      "demo_restore_state",
      "isDemoActive",
      DEFAULT_DEMO_RESTORE.isDemoActive,
    ),
  };
}

export async function setDemoRestoreState(partial: Partial<DemoRestoreState>) {
  const db = await getDb();
  const merged = { ...(await getDemoRestoreState()), ...partial };
  for (const [key, value] of Object.entries(merged)) {
    await setKeyValue(db, "demo_restore_state", key, serializeJson(value));
  }
  return merged;
}

export async function getHydratedState(): Promise<HydratedAppState> {
  const [profiles, sessions, sleepSettings, appearance, emergency, demoRestore, appState] =
    await Promise.all([
      getProfiles(),
      getSessions(),
      getSleepSettings(),
      getAppearance(),
      getEmergencyState(),
      getDemoRestoreState(),
      getAppState(),
    ]);

  const activeSession = sessions.find((session) => session.endTime == null) ?? null;

  return {
    ready: true,
    profiles,
    sessions,
    sleepSettings,
    appearance,
    emergency,
    demoRestore,
    appState,
    activeSessionId: activeSession?.id ?? null,
    currentErrorMessage: null,
  };
}

export async function clearAllData() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM profiles;
    DELETE FROM sessions;
    DELETE FROM sleep_settings;
    DELETE FROM appearance_settings;
    DELETE FROM emergency_state;
    DELETE FROM app_state;
    DELETE FROM demo_restore_state;
  `);
  await migrate(db);
}

export async function createSleepProfile(name = "Sleep") {
  const existing = await getProfiles();
  const profile = makeProfile({
    name,
    order: existing.length,
  });
  await upsertProfile(profile);
  return profile;
}

export async function setProfileSelectedActivity(
  profileId: string,
  selectedActivity: ActivitySelectionSnapshot,
) {
  const profiles = await getProfiles();
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) return null;

  const updated = {
    ...profile,
    selectedActivity,
    updatedAt: new Date().toISOString(),
  };
  await upsertProfile(updated);
  return updated;
}
