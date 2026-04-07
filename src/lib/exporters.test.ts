import { exportSessionsCsv, exportSessionsMarkdown } from "@/lib/exporters";
import type { BlockedProfile, BlockedProfileSession } from "@/lib/types";

const profile: BlockedProfile = {
  id: "profile-1",
  name: "Night, Owl",
  selectedActivity: {
    packageNames: [],
    categoryIds: [],
    webDomains: [],
    iosRawSelection: null,
  },
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  blockingStrategyId: "ManualBlockingStrategy",
  strategyData: null,
  order: 0,
  enableLiveActivity: true,
  reminderTimeInSeconds: null,
  customReminderMessage: null,
  enableBreaks: true,
  breakTimeInMinutes: 15,
  enableStrictMode: false,
  enableAllowMode: false,
  enableAllowModeDomains: false,
  enableSafariBlocking: true,
  useSleepSchedule: false,
  physicalUnblockNFCTagId: null,
  physicalUnblockQRCodeId: null,
  domains: [],
  schedule: null,
  disableBackgroundStops: false,
};

const completedSession: BlockedProfileSession = {
  id: "session-complete",
  tag: "Manual Log",
  blockedProfileId: profile.id,
  startTime: "2026-04-01T23:00:00.000Z",
  endTime: "2026-04-02T07:00:00.000Z",
  breakStartTime: "2026-04-02T03:00:00.000Z",
  breakEndTime: "2026-04-02T03:15:00.000Z",
  startTimeZoneIdentifier: "UTC",
  endTimeZoneIdentifier: "UTC",
  breakStartTimeZoneIdentifier: "UTC",
  breakEndTimeZoneIdentifier: "UTC",
  forceStarted: false,
  needsHealthKitSync: true,
  healthKitSyncVersion: 2,
};

const activeSession: BlockedProfileSession = {
  ...completedSession,
  id: "session-active",
  endTime: null,
  breakStartTime: null,
  breakEndTime: null,
};

describe("data exporters", () => {
  test("exportSessionsCsv produces quoted CSV rows when needed", () => {
    const csv = exportSessionsCsv([completedSession], [profile], false);

    expect(csv).toContain("session_id,profile_name,start_time,end_time,break_start_time,break_end_time");
    expect(csv).toContain('"Night, Owl"');
    expect(csv).toContain("2026-04-01T23:00:00.000Z");
  });

  test("exportSessionsMarkdown includes metadata, completed sessions, and active sessions", () => {
    const markdown = exportSessionsMarkdown([completedSession, activeSession], [profile], false);

    expect(markdown).toContain("# Twilight Sleep Tracker — Data Export");
    expect(markdown).toContain("| Profiles Included | 1 |");
    expect(markdown).toContain("| Total Sessions | 2 |");
    expect(markdown).toContain("| Completed Sessions | 1 |");
    expect(markdown).toContain("### Session 1 — Night, Owl");
    expect(markdown).toContain("| Status | ✅ Completed |");
    expect(markdown).toContain("| Status | 🔴 In Progress |");
    expect(markdown).toContain("| Break Duration | 15m |");
  });
});
