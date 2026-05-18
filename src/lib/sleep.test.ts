import {
  buildSleepMetrics,
  calculateAccuracy,
  calculateSleepConsistency,
  calculateWakeConsistency,
  canonicalSessions,
  getSleepGreeting,
  processWeeklySleepData,
  sessionDurationSeconds,
} from "@/lib/sleep";
import type { SleepSession } from "@/lib/types";

function makeSession(
  id: string,
  startTime: string,
  endTime: string | null,
  partial?: Partial<SleepSession>,
): SleepSession {
  return {
    id,
    tag: "Manual Log",
    startTime,
    endTime,
    startTimeZoneIdentifier: "UTC",
    endTimeZoneIdentifier: "UTC",
    needsHealthKitSync: true,
    healthKitSyncVersion: 2,
    ...partial,
  };
}

describe("sleep metrics utilities", () => {
  test("sessionDurationSeconds computes elapsed seconds from ISO timestamps", () => {
    const session = makeSession("s1", "2026-04-01T23:00:00.000Z", "2026-04-02T07:00:00.000Z");
    expect(sessionDurationSeconds(session)).toBe(8 * 60 * 60);
  });

  test("canonicalSessions keeps the longest valid session per wake day", () => {
    const sessions = [
      makeSession("short", "2026-04-02T00:00:00.000Z", "2026-04-02T05:00:00.000Z"),
      makeSession("long", "2026-04-01T22:00:00.000Z", "2026-04-02T07:30:00.000Z"),
      makeSession("other-day", "2026-04-02T23:00:00.000Z", "2026-04-03T07:00:00.000Z"),
    ];

    expect(canonicalSessions(sessions).map((session) => session.id)).toEqual(["long", "other-day"]);
  });

  test("processWeeklySleepData returns a seven-day window ending on the latest completed night", () => {
    const sessions = [
      makeSession("s1", "2026-04-01T23:00:00.000Z", "2026-04-02T07:00:00.000Z"),
      makeSession("s2", "2026-04-03T23:30:00.000Z", "2026-04-04T07:30:00.000Z"),
      makeSession("s3", "2026-04-05T22:45:00.000Z", "2026-04-06T06:45:00.000Z"),
    ];

    const weekly = processWeeklySleepData(sessions);

    expect(weekly).toHaveLength(7);
    expect(weekly.at(-1)?.date.toISOString()).toContain("2026-04-06");
    expect(weekly.filter((entry) => entry.duration > 0)).toHaveLength(3);
  });

  test("consistency and accuracy scores stay high for near-target sleep timing", () => {
    const sessions = [
      makeSession("s1", "2026-04-01T23:00:00.000Z", "2026-04-02T07:00:00.000Z"),
      makeSession("s2", "2026-04-02T23:10:00.000Z", "2026-04-03T07:05:00.000Z"),
      makeSession("s3", "2026-04-03T22:55:00.000Z", "2026-04-04T06:50:00.000Z"),
      makeSession("s4", "2026-04-04T23:05:00.000Z", "2026-04-05T07:15:00.000Z"),
    ];

    const weekly = processWeeklySleepData(sessions);

    expect(calculateSleepConsistency(weekly)).toBeGreaterThan(90);
    expect(calculateWakeConsistency(weekly)).toBeGreaterThan(90);
    expect(calculateAccuracy(weekly, 23 * 60, 7 * 60)).toBeGreaterThan(90);
  });

  test("buildSleepMetrics summarizes duration, buckets, and debt correctly", () => {
    const sessions = [
      makeSession("s1", "2026-04-01T23:00:00.000Z", "2026-04-02T07:00:00.000Z"),
      makeSession("s2", "2026-04-02T23:30:00.000Z", "2026-04-03T07:00:00.000Z"),
      makeSession("s3", "2026-04-03T22:30:00.000Z", "2026-04-04T07:00:00.000Z"),
      makeSession("s4", "2026-04-04T23:30:00.000Z", "2026-04-05T05:30:00.000Z"),
    ];

    const metrics = buildSleepMetrics(sessions, 23 * 60, 7 * 60);
    const records = metrics.recordsInRange("All");
    const buckets = metrics.durationBuckets(records);
    const debt = metrics.cumulativeDebtSeries(records);

    expect(records).toHaveLength(4);
    expect(metrics.averageDuration(records)).toBeCloseTo(7.5, 5);
    expect(metrics.goalHitRate(records)).toBe(75);
    expect(buckets.find((bucket) => bucket.label === "6-6.5h")?.count).toBe(1);
    expect(buckets.find((bucket) => bucket.label === "7.5-8h")?.count).toBe(1);
    expect(buckets.find((bucket) => bucket.label === "8h+")?.count).toBe(2);
    expect(debt.at(-1)?.cumulativeHours).toBeCloseTo(2, 5);
  });

  test("getSleepGreeting matches the active state and schedule windows", () => {
    const atLocalTime = (hour: number, minute = 0) => new Date(2026, 3, 7, hour, minute, 0, 0);

    expect(getSleepGreeting(23 * 60, 7 * 60, true, atLocalTime(2))).toBe("Sweet Dreams 🌙");
    expect(getSleepGreeting(22 * 60, 7 * 60, false, atLocalTime(21, 30))).toBe("Bedtime Soon! 🛏️");
    expect(getSleepGreeting(22 * 60, 7 * 60, false, atLocalTime(2))).toBe("Why Up? 🤨");
  });
});
