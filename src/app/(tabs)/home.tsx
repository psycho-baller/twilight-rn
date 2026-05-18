import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import {
  DurationMomentumChart,
  SleepAlignmentChart,
  WeeklySleepWindowChart,
} from "@/charts";
import { formatDuration, formatHours, formatSignedHours } from "@/lib/format";
import {
  buildSleepMetrics,
  getSleepGreeting,
  processWeeklySleepData,
} from "@/lib/sleep";
import { selectSleepProfile, useAppStore } from "@/lib/store";
import {
  EmptyPanel,
  GlassPanel,
  MetricCard,
  MetricGrid,
  NativeScreen,
  SectionHeader,
  SegmentedPills,
  TrendDelta,
  TwilightButton,
  useTwilightTheme,
} from "@/ui/surface";

const initialNow = Date.now();
type HomeMode = "Week" | "7-Night Avg" | "Score" | "Core";
type HistoryRange = "90D" | "All";

function useNow(refreshIntervalMs: number) {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = setInterval(updateNow, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs]);

  return now;
}

function computeStreak(dates: Date[]) {
  if (dates.length === 0) return 0;
  const sorted = dates
    .map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime())
    .sort((left, right) => right - left);
  let streak = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1] - sorted[index] === 24 * 60 * 60 * 1000) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export default function HomeRoute() {
  const [viewMode, setViewMode] = useState<HomeMode>("Week");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("90D");
  const [greetingSeed, setGreetingSeed] = useState(0);
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const now = useNow(activeSessionId ? 1000 : 60_000);
  const startProfile = useAppStore((state) => state.startProfile);
  const stopActiveSession = useAppStore((state) => state.stopActiveSession);
  const toggleBreak = useAppStore((state) => state.toggleBreak);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepProfile = useAppStore(selectSleepProfile);
  const { theme } = useTwilightTheme();

  useEffect(() => {
    setLastViewedTab("home").catch(() => undefined);
  }, [setLastViewedTab]);

  const profileSessions = useMemo(
    () =>
      sleepProfile
        ? sessions.filter((session) => session.blockedProfileId === sleepProfile.id && session.endTime)
        : [],
    [sessions, sleepProfile],
  );

  const metrics = useMemo(
    () => buildSleepMetrics(profileSessions, sleepSettings.optimalSleepMinutes, sleepSettings.optimalWakeMinutes),
    [profileSessions, sleepSettings.optimalSleepMinutes, sleepSettings.optimalWakeMinutes],
  );
  const weeklyData = useMemo(() => processWeeklySleepData(profileSessions), [profileSessions]);
  const rangeRecords = historyRange === "90D" ? metrics.recordsInRange("90D") : metrics.recordsInRange("All");
  const movingAverageSeries = metrics.movingAverageSeries(rangeRecords, 7);
  const alignmentSeries = metrics.sleepAlignmentSeries(rangeRecords);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const isSleeping = activeSession?.blockedProfileId === sleepProfile?.id;
  const activeDurationSeconds = activeSession
    ? Math.max(0, Math.floor((now - new Date(activeSession.startTime).getTime()) / 1000))
    : 0;
  const lastSleepSession = profileSessions
    .filter((session) => session.endTime)
    .sort((left, right) => new Date(right.endTime!).getTime() - new Date(left.endTime!).getTime())[0];
  const currentStreak = computeStreak(metrics.records.map((record) => record.date));
  const durationTrend = metrics.durationTrendPercent(metrics.recordsInRange("30D"));
  const latestTracked = weeklyData.filter((item) => item.duration > 0).at(-1);
  const previousTracked = weeklyData.filter((item) => item.duration > 0).at(-2);
  const lastNightDelta =
    latestTracked && previousTracked
      ? ((latestTracked.duration - previousTracked.duration) / Math.max(1, previousTracked.duration)) * 100
      : null;
  const greeting = getSleepGreeting(
    sleepSettings.optimalSleepMinutes,
    sleepSettings.optimalWakeMinutes,
    Boolean(isSleeping),
    new Date(now),
    greetingSeed,
  );

  return (
    <NativeScreen>
      <SectionHeader
        title={greeting}
        subtitle={new Date(now).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
        trailing={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Text onPress={() => router.push("/modals/metrics-guide")}>
              <Ionicons name="information-circle-outline" size={21} color={theme.textSecondary} />
            </Text>
            <Text onPress={() => setGreetingSeed((value) => value + 7_777)}>
              <Ionicons name="sparkles" size={21} color={theme.textSecondary} />
            </Text>
          </View>
        }
      />

      {!sleepProfile ? (
        <EmptyPanel
          title="Sleep profile missing"
          subtitle="Finish onboarding or restore a backup to unlock the full Twilight dashboard."
        />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {viewMode !== "Week" ? (
                <TwilightButton
                  title={historyRange}
                  subtle
                  style={{ minHeight: 36, minWidth: 60, borderRadius: 13, paddingVertical: 8 }}
                  textStyle={{ fontSize: 12 }}
                  onPress={() => setHistoryRange((value) => (value === "90D" ? "All" : "90D"))}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <SegmentedPills options={["Week", "7-Night Avg", "Score", "Core"]} value={viewMode} onChange={setViewMode} />
              </View>
            </View>

            <GlassPanel padded={false} style={{ padding: 14 }}>
              {viewMode === "Week" ? (
                weeklyData.length === 0 ? (
                  <EmptyPanel title="Your sleep story starts tonight" subtitle="Log your first night to see your patterns here." />
                ) : (
                  <WeeklySleepWindowChart
                    data={weeklyData}
                    optimalSleepMinutes={sleepSettings.optimalSleepMinutes}
                    optimalWakeMinutes={sleepSettings.optimalWakeMinutes}
                    targetDurationHours={metrics.targetDurationHours}
                  />
                )
              ) : viewMode === "7-Night Avg" ? (
                movingAverageSeries.filter((point) => point.movingAverageHours != null).length === 0 ? (
                  <EmptyPanel title="Track 7 nights" subtitle="A rolling trend appears once Twilight has enough completed sleep logs." />
                ) : (
                  <View style={{ gap: 12 }}>
                    <SectionHeader title="7-Night Moving Average" subtitle="Bars are nightly sleep. Line smooths short-term noise." compact />
                    <DurationMomentumChart series={movingAverageSeries} targetHours={metrics.targetDurationHours} />
                  </View>
                )
              ) : alignmentSeries.length === 0 ? (
                <EmptyPanel title="Score locked" subtitle="Track a completed night with a target bedtime and wake time to unlock your alignment trend." />
              ) : (
                <View style={{ gap: 12 }}>
                  <SectionHeader
                    title={viewMode === "Score" ? "Sleep Alignment Score" : "Core Sleep Score"}
                    subtitle={viewMode === "Score" ? "Duration, timing, phase, and consistency." : "A cleaner duration and consistency read."}
                    compact
                  />
                  <SleepAlignmentChart series={alignmentSeries} coreOnly={viewMode === "Core"} />
                </View>
              )}
            </GlassPanel>
          </View>

          <GlassPanel style={{ gap: 16 }}>
            {isSleeping && activeSession ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text selectable style={{ color: theme.textPrimary, fontSize: 22, fontWeight: "900" }}>
                      Sleep mode activated
                    </Text>
                    <Text selectable style={{ color: theme.textSecondary, marginTop: 3, fontSize: 13 }}>
                      Dream Big!
                    </Text>
                  </View>
                  <Text style={{ color: theme.accent, fontSize: 14, fontWeight: "900" }}>
                    {formatDuration(activeDurationSeconds)}
                  </Text>
                </View>
                <Text selectable style={{ color: theme.textPrimary, fontSize: 42, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                  {formatDuration(activeDurationSeconds)}
                </Text>
                <TwilightButton title="Wake Up" onPress={() => void stopActiveSession()} />
                {sleepProfile.enableBreaks ? (
                  <TwilightButton title="Toggle Break" subtle onPress={() => void toggleBreak()} />
                ) : null}
                <Text selectable style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
                  Tap to wake up or scan your NFC tag when Android triggers ship.
                </Text>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text selectable style={{ color: theme.textPrimary, fontSize: 18, fontWeight: "900" }}>
                      {lastSleepSession ? "Last Night's Sleep" : "Start tonight!"}
                    </Text>
                    <Text selectable style={{ color: theme.textSecondary, marginTop: 3, fontSize: 13 }}>
                      {lastSleepSession ? "Consistency compounds. Keep the rhythm." : "Track your first night to see insights."}
                    </Text>
                  </View>
                  {currentStreak > 0 ? (
                    <View style={{ borderRadius: 15, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.glass }}>
                      <Text style={{ color: theme.textPrimary, fontWeight: "900" }}>🔥 {currentStreak}</Text>
                    </View>
                  ) : null}
                </View>
                {lastSleepSession ? (
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text selectable style={{ color: theme.textPrimary, fontSize: 37, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                      {formatDuration((new Date(lastSleepSession.endTime!).getTime() - new Date(lastSleepSession.startTime).getTime()) / 1000)}
                    </Text>
                    <TrendDelta value={lastNightDelta} />
                  </View>
                ) : null}
                <MetricGrid>
                  <MetricCard title="30D avg" value={formatHours(metrics.averageDuration(metrics.recordsInRange("30D")) ?? 0)} subtitle="recent rhythm" icon="◒" />
                  <MetricCard title="vs target" value={formatSignedHours((metrics.averageDuration(metrics.recordsInRange("30D")) ?? 0) - metrics.targetDurationHours)} subtitle="sleep debt" icon="⌁" />
                  <MetricCard title="trend" value={durationTrend == null ? "-" : `${Math.round(durationTrend)}%`} subtitle="last week" icon="↗" />
                  <MetricCard title="goal hit" value={`${metrics.goalHitRate(metrics.recordsInRange("30D"))}%`} subtitle="within 45m" icon="◎" />
                </MetricGrid>
                <TwilightButton title="Go to Sleep" onPress={() => void startProfile(sleepProfile.id)} />
                <Text selectable style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
                  Tap to start or scan your NFC tag once Android physical triggers are enabled.
                </Text>
              </>
            )}
          </GlassPanel>
        </>
      )}
    </NativeScreen>
  );
}
