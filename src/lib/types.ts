export type ISODateString = string;

export type ThemeMode = "System" | "Sunset" | "Night Sky";
export type ColorPalette = "Twilight" | "Amethyst";

export type BlockingStrategyId =
  | "ManualBlockingStrategy"
  | "NFCBlockingStrategy"
  | "NFCManualBlockingStrategy"
  | "NFCTimerBlockingStrategy"
  | "QRCodeBlockingStrategy"
  | "QRManualBlockingStrategy"
  | "QRTimerBlockingStrategy";

export type SleepMetricsRange = "30D" | "90D" | "1Y" | "All";

export type ActivitySelectionSnapshot = {
  packageNames: string[];
  categoryIds: string[];
  webDomains: string[];
  iosRawSelection?: string | null;
};

export type BlockedProfileSchedule = {
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  updatedAt: ISODateString;
};

export type BlockedProfile = {
  id: string;
  name: string;
  selectedActivity: ActivitySelectionSnapshot;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  blockingStrategyId: BlockingStrategyId | null;
  strategyData: string | null;
  order: number;
  enableLiveActivity: boolean;
  reminderTimeInSeconds: number | null;
  customReminderMessage: string | null;
  enableBreaks: boolean;
  breakTimeInMinutes: number;
  enableStrictMode: boolean;
  enableAllowMode: boolean;
  enableAllowModeDomains: boolean;
  enableSafariBlocking: boolean;
  useSleepSchedule: boolean;
  physicalUnblockNFCTagId: string | null;
  physicalUnblockQRCodeId: string | null;
  domains: string[] | null;
  schedule: BlockedProfileSchedule | null;
  disableBackgroundStops: boolean;
};

export type BlockedProfileSession = {
  id: string;
  tag: string;
  blockedProfileId: string;
  startTime: ISODateString;
  endTime: ISODateString | null;
  breakStartTime: ISODateString | null;
  breakEndTime: ISODateString | null;
  startTimeZoneIdentifier: string | null;
  endTimeZoneIdentifier: string | null;
  breakStartTimeZoneIdentifier: string | null;
  breakEndTimeZoneIdentifier: string | null;
  forceStarted: boolean;
  needsHealthKitSync: boolean;
  healthKitSyncVersion: number;
};

export type SleepSettings = {
  isOnboarded: boolean;
  optimalSleepMinutes: number;
  optimalWakeMinutes: number;
  sleepProfileId: string | null;
  windDownReminderEnabled: boolean;
  healthSyncEnabled: boolean;
};

export type AppearanceSettings = {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
};

export type EmergencyState = {
  emergencyUnblocksRemaining: number;
  emergencyUnblocksResetPeriodInWeeks: number;
  lastEmergencyUnblocksResetDateTimestamp: number;
};

export type DemoRestoreState = {
  backupArchiveJson: string | null;
  backupCreatedAt: ISODateString | null;
  isDemoActive: boolean;
};

export type AppStateRecord = {
  pendingExternalAction: string | null;
  lastViewedTab: string;
};

export type SessionSnapshot = {
  id: string;
  tag: string;
  blockedProfileId: string;
  startTime: ISODateString;
  endTime: ISODateString | null;
  breakStartTime: ISODateString | null;
  breakEndTime: ISODateString | null;
  startTimeZoneIdentifier: string | null;
  endTimeZoneIdentifier: string | null;
  breakStartTimeZoneIdentifier: string | null;
  breakEndTimeZoneIdentifier: string | null;
  forceStarted: boolean;
};

export type ArchiveMetadata = {
  archiveType: string;
  schemaVersion: number;
  exportedAt: ISODateString;
  timeZoneIdentifier: string;
  appVersion: string | null;
};

export type ArchivePayload = {
  metadata: ArchiveMetadata;
  sleepSettings: {
    isOnboarded: boolean;
    optimalSleepMinutes: number;
    optimalWakeMinutes: number;
    sleepProfileId: string | null;
    windDownReminderEnabled: boolean;
    healthSyncEnabled: boolean;
  };
  appearance: {
    themeMode: string;
    colorPalette: string;
  };
  profiles: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  sharedState: {
    activeSharedSession: SessionSnapshot | null;
    completedScheduleSessions: SessionSnapshot[];
  };
};

export type DataArchivePreview = {
  exportedAt: ISODateString;
  appVersion: string | null;
  profileCount: number;
  newProfiles: number;
  updatedProfiles: number;
  sessionCount: number;
  newSessions: number;
  updatedSessions: number;
  settingsChanges: number;
  appearanceChanges: number;
  completedScheduleSessionChanges: number;
  hasIncomingActiveSharedSession: boolean;
  hasActiveSessionConflict: boolean;
};

export type StrategyDescriptor = {
  id: BlockingStrategyId;
  name: string;
  description: string;
  icon: string;
  accent: string;
  executableInPhaseOne: boolean;
};

export type DailySleepData = {
  dayLabel: string;
  date: Date;
  startOffset: number;
  endOffset: number;
  duration: number;
};

export type SleepNightRecord = {
  date: Date;
  weekday: number;
  durationHours: number;
  bedtimeOffset: number;
  wakeOffset: number;
  midpointOffset: number;
};

export type SleepMovingAveragePoint = {
  date: Date;
  durationHours: number;
  movingAverageHours: number | null;
};

export type SleepConsistencyPoint = {
  date: Date;
  sleepConsistency: number | null;
  wakeConsistency: number | null;
  scheduleAccuracy: number | null;
};

export type SleepDebtPoint = {
  date: Date;
  cumulativeHours: number;
};

export type SleepWeekdayAverage = {
  weekday: number;
  dayName: string;
  averageHours: number;
  nights: number;
};

export type SleepDurationBucket = {
  label: string;
  count: number;
  share: number;
};

export type SleepTrendPeriod = {
  days: number;
  averageDuration: number | null;
  previousAverageDuration: number | null;
  changePercent: number | null;
  sparkline: number[];
};

export type SleepAlignmentScorePoint = {
  date: Date;
  dailyScore: number;
  trendScore: number;
  coreScore: number;
  durationScore: number;
  timingScore: number;
  phaseScore: number;
  consistencyScore: number;
};

export type SleepTimingPoint = {
  date: Date;
  bedtimeOffset: number;
  wakeOffset: number;
  midpointOffset: number;
  durationHours: number;
};

export type SleepSocialJetlag = {
  weekdayMidpoint: number | null;
  weekendMidpoint: number | null;
  deltaHours: number | null;
};

export type HydratedAppState = {
  ready: boolean;
  profiles: BlockedProfile[];
  sessions: BlockedProfileSession[];
  sleepSettings: SleepSettings;
  appearance: AppearanceSettings;
  emergency: EmergencyState;
  demoRestore: DemoRestoreState;
  appState: AppStateRecord;
  activeSessionId: string | null;
  currentErrorMessage: string | null;
};
