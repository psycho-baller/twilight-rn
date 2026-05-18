import type { AppearanceSettings, AppStateRecord, SleepSettings } from "@/lib/types";

export const DB_NAME = "twilight.db";
export const ARCHIVE_TYPE = "twilight-full-backup";
export const CURRENT_ARCHIVE_SCHEMA_VERSION = 1;
export const APP_VERSION = "1.0.0";
export const MINIMUM_VALID_SESSION_SECONDS = 5 * 60;

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  isOnboarded: false,
  optimalSleepMinutes: 22 * 60,
  optimalWakeMinutes: 7 * 60,
  windDownReminderEnabled: true,
  healthSyncEnabled: false,
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "Night Sky",
  colorPalette: "Twilight",
};

export const DEFAULT_APP_STATE: AppStateRecord = {
  pendingExternalAction: null,
  lastViewedTab: "home",
};
