import type {
  AppearanceSettings,
  AppStateRecord,
  EmergencyState,
  SleepSettings,
  StrategyDescriptor,
} from "@/lib/types";

export const DB_NAME = "twilight.db";
export const ARCHIVE_TYPE = "twilight-full-backup";
export const CURRENT_ARCHIVE_SCHEMA_VERSION = 1;
export const DEMO_PROFILE_ID = "D122B33A-0F7A-47A0-8C73-BB6D8ACCEB3E";
export const APP_VERSION = "1.0.0";
export const MINIMUM_VALID_SESSION_SECONDS = 5 * 60;

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  isOnboarded: false,
  optimalSleepMinutes: 22 * 60,
  optimalWakeMinutes: 7 * 60,
  sleepProfileId: null,
  windDownReminderEnabled: true,
  healthSyncEnabled: false,
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeMode: "Night Sky",
  colorPalette: "Twilight",
};

export const DEFAULT_EMERGENCY_STATE: EmergencyState = {
  emergencyUnblocksRemaining: 3,
  emergencyUnblocksResetPeriodInWeeks: 4,
  lastEmergencyUnblocksResetDateTimestamp: 0,
};

export const DEFAULT_APP_STATE: AppStateRecord = {
  pendingExternalAction: null,
  lastViewedTab: "home",
};

export const STRATEGIES: StrategyDescriptor[] = [
  {
    id: "ManualBlockingStrategy",
    name: "Manual",
    description: "Block and unblock profiles manually through the app",
    icon: "hand.raised.fill",
    accent: "#38BDF8",
    executableInPhaseOne: true,
  },
  {
    id: "NFCBlockingStrategy",
    name: "NFC Tags",
    description: "Block and unblock profiles by using the exact same NFC tag",
    icon: "dot.radiowaves.left.and.right",
    accent: "#FDE047",
    executableInPhaseOne: false,
  },
  {
    id: "NFCManualBlockingStrategy",
    name: "NFC + Manual",
    description: "Block manually, but unblock by using any NFC tag",
    icon: "waveform.path.ecg",
    accent: "#FBBF24",
    executableInPhaseOne: false,
  },
  {
    id: "NFCTimerBlockingStrategy",
    name: "NFC + Timer",
    description: "Block for a set duration, unblock by using any NFC tag",
    icon: "timer",
    accent: "#34D399",
    executableInPhaseOne: false,
  },
  {
    id: "QRCodeBlockingStrategy",
    name: "QR Codes",
    description: "Block and unblock profiles by scanning the same QR code",
    icon: "qrcode",
    accent: "#F472B6",
    executableInPhaseOne: false,
  },
  {
    id: "QRManualBlockingStrategy",
    name: "QR + Manual",
    description: "Block manually, but unblock by scanning any QR code",
    icon: "bolt.fill",
    accent: "#FB7185",
    executableInPhaseOne: false,
  },
  {
    id: "QRTimerBlockingStrategy",
    name: "QR + Timer",
    description: "Block for a set duration, unblock by scanning any QR code",
    icon: "clock.arrow.circlepath",
    accent: "#2DD4BF",
    executableInPhaseOne: false,
  },
];

export const DEFERRED_FEATURE_MESSAGE =
  "This control is kept for parity with the iOS app, but the Android core build defers it to phase 2.";
