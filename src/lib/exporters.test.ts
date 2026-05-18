import { exportSessionsCsv, exportSessionsMarkdown } from "@/lib/exporters";
import type { SleepSession } from "@/lib/types";

const completedSession: SleepSession = {
  id: "session-complete",
  tag: "Manual Log",
  startTime: "2026-04-01T23:00:00.000Z",
  endTime: "2026-04-02T07:00:00.000Z",
  startTimeZoneIdentifier: "UTC",
  endTimeZoneIdentifier: "UTC",
  needsHealthKitSync: true,
  healthKitSyncVersion: 2,
};

const activeSession: SleepSession = {
  ...completedSession,
  id: "session-active",
  endTime: null,
};

describe("data exporters", () => {
  test("exportSessionsCsv produces quoted CSV rows when needed", () => {
    const csv = exportSessionsCsv([completedSession], false);

    expect(csv).toContain("session_id,tag,start_time,end_time");
    expect(csv).toContain("Manual Log");
    expect(csv).toContain("2026-04-01T23:00:00.000Z");
  });

  test("exportSessionsMarkdown includes metadata, completed sessions, and active sessions", () => {
    const markdown = exportSessionsMarkdown([completedSession, activeSession], false);

    expect(markdown).toContain("# Twilight Sleep Tracker — Data Export");
    expect(markdown).toContain("| Total Sessions | 2 |");
    expect(markdown).toContain("| Completed Sessions | 1 |");
    expect(markdown).toContain("### Session 1 — Manual Log");
    expect(markdown).toContain("| Status | ✅ Completed |");
    expect(markdown).toContain("| Status | 🔴 In Progress |");
  });
});
