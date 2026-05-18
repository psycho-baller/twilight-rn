import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import {
  CumulativeDebtChart,
  DurationDistributionChart,
  DurationMomentumChart,
  RegularityComponentsChart,
  RollingConsistencyChart,
  SleepAlignmentChart,
  TrendsAnalysisCard,
  WeekdayAverageChart,
} from "@/charts";
import { formatSignedHours } from "@/lib/format";
import { buildSleepMetrics } from "@/lib/sleep";
import { useAppStore } from "@/lib/store";
import type { SleepMetricsRange, SleepNightRecord } from "@/lib/types";
import {
  EmptyPanel,
  GlassPanel,
  MetricCard,
  MetricGrid,
  NativeScreen,
  SectionHeader,
  SegmentedPills,
  TwilightButton,
  chartPalette,
  formatHoursCompact,
  useTwilightTheme,
} from "@/ui/surface";

const rangeOptions: SleepMetricsRange[] = ["30D", "90D", "1Y", "All"];
const regularityOptions = ["All", "Bedtime", "Wake", "Accuracy"] as const;
type RegularityComponent = (typeof regularityOptions)[number];

function dayStamp(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function currentStreak(records: SleepNightRecord[]) {
  if (records.length === 0) return 0;
  const sorted = [...new Set(records.map((record) => dayStamp(record.date)))].sort((left, right) => right - left);
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

function bestStreak(records: SleepNightRecord[]) {
  if (records.length === 0) return 0;
  const sorted = [...new Set(records.map((record) => dayStamp(record.date)))].sort((left, right) => right - left);
  let best = 1;
  let run = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] - sorted[index - 1] === 24 * 60 * 60 * 1000) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }
  return best;
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${Math.round(value)}%`;
}

function InlineEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  const { theme } = useTwilightTheme();
  return (
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: theme.outline, backgroundColor: theme.glass, padding: 18, gap: 5 }}>
      <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text>
    </View>
  );
}

export default function MetricsRoute() {
  const [range, setRange] = useState<SleepMetricsRange>("90D");
  const [regComp, setRegComp] = useState<RegularityComponent>("All");
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

  useEffect(() => {
    setLastViewedTab("metrics").catch(() => undefined);
  }, [setLastViewedTab]);

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.endTime),
    [sessions],
  );

  const metrics = useMemo(
    () => buildSleepMetrics(completedSessions, sleepSettings.optimalSleepMinutes, sleepSettings.optimalWakeMinutes),
    [completedSessions, sleepSettings.optimalSleepMinutes, sleepSettings.optimalWakeMinutes],
  );
  const records = metrics.recordsInRange(range);
  const movingAverageSeries = metrics.movingAverageSeries(records, 7);
  const consistencySeries = metrics.rollingConsistencySeries(records, records.length < 14 ? 7 : 14);
  const debtSeries = metrics.cumulativeDebtSeries(records);
  const weekdayAverages = metrics.weekdayAverages(records);
  const durationBuckets = metrics.durationBuckets(records);
  const trendPeriods = metrics.durationTrendsAnalysis();
  const alignmentSeries = metrics.sleepAlignmentSeries(records);
  const socialJetlag = metrics.socialJetlag(records);
  const durationTrend = metrics.durationTrendPercent(records);
  const latestScore = alignmentSeries.at(-1);
  const averageDuration = metrics.averageDuration(records);
  const medianDuration = metrics.medianDuration(records);
  const targetDelta = averageDuration == null ? null : averageDuration - metrics.targetDurationHours;
  const weekdayAverage =
    weekdayAverages.filter((day) => day.weekday >= 2 && day.weekday <= 6 && day.nights > 0).reduce((sum, day) => sum + day.averageHours * day.nights, 0) /
    Math.max(1, weekdayAverages.filter((day) => day.weekday >= 2 && day.weekday <= 6).reduce((sum, day) => sum + day.nights, 0));
  const weekendAverage =
    weekdayAverages.filter((day) => (day.weekday === 1 || day.weekday === 7) && day.nights > 0).reduce((sum, day) => sum + day.averageHours * day.nights, 0) /
    Math.max(1, weekdayAverages.filter((day) => day.weekday === 1 || day.weekday === 7).reduce((sum, day) => sum + day.nights, 0));

  return (
    <NativeScreen>
      <SectionHeader
        title="Sleep Intelligence"
        subtitle="Long-range sleep, regularity, recovery, and timing analysis from your completed nights."
        trailing={
          <Text onPress={() => router.push("/modals/metrics-guide")}>
            <Ionicons name="information-circle-outline" size={22} color={theme.textSecondary} />
          </Text>
        }
      />

      <SegmentedPills options={rangeOptions} value={range} onChange={setRange} />

      {records.length === 0 ? (
        <EmptyPanel
          title="Not enough nights for metrics yet"
          subtitle="Track a few nights and this tab will unlock trends, regularity, recovery, and long-range sleep patterns."
        />
      ) : (
        <>
          <GlassPanel style={{ gap: 14 }}>
            <SectionHeader title="Overview" subtitle={`${records.length} completed nights in ${range}.`} compact />
            <MetricGrid>
              <MetricCard title="Tracked Nights" value={`${records.length}`} subtitle="completed sessions" icon="☾" tint={palette.cyan} />
              <MetricCard title="Coverage" value={`${metrics.trackingCoverage(records, range)}%`} subtitle="range filled" icon="◌" tint={palette.indigo} />
              <MetricCard title="Average" value={averageDuration == null ? "-" : formatHoursCompact(averageDuration)} subtitle="per night" icon="◒" tint={palette.green} />
              <MetricCard title="Goal Hit" value={`${metrics.goalHitRate(records)}%`} subtitle="within 45 minutes" icon="◎" tint={palette.orange} />
              <MetricCard title="Current Streak" value={`${currentStreak(records)}`} subtitle="wake-days" icon="🔥" tint={palette.pink} />
              <MetricCard title="Best Streak" value={`${bestStreak(records)}`} subtitle="longest run" icon="↟" tint={palette.cyan} />
            </MetricGrid>
          </GlassPanel>

          <GlassPanel style={{ gap: 14 }}>
            <SectionHeader title="Highlights" subtitle="The same high-level sleep snapshot surfaced in the metrics overview." compact />
            <MetricGrid>
              <MetricCard title="Longest Night" value={formatHoursCompact(metrics.longestNight(records))} subtitle="best banked sleep" icon="↑" tint={palette.green} />
              <MetricCard title="Shortest Night" value={formatHoursCompact(metrics.shortestNight(records))} subtitle="lowest valid sleep" icon="↓" tint={palette.orange} />
              <MetricCard title="Total Sleep" value={formatHoursCompact(metrics.totalSleepHours(records))} subtitle="range total" icon="Σ" tint={palette.cyan} />
              <MetricCard title="Debt / Credit" value={targetDelta == null ? "-" : formatSignedHours(targetDelta)} subtitle="avg vs target" icon="⌁" tint={(targetDelta ?? 0) >= 0 ? palette.green : palette.red} />
            </MetricGrid>
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Duration Momentum" subtitle="Nightly duration smoothed into a 7-night moving average." compact />
            {movingAverageSeries.some((point) => point.movingAverageHours != null) ? (
              <DurationMomentumChart series={movingAverageSeries} targetHours={metrics.targetDurationHours} />
            ) : (
              <InlineEmpty title="Track 7 nights" subtitle="The duration trend appears once there are enough completed nights in this range." />
            )}
          </GlassPanel>

          <TrendsAnalysisCard periods={trendPeriods} />

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Regularity" subtitle="Bedtime, wake-time, and schedule accuracy blended into a stability score." compact />
            <MetricGrid>
              <MetricCard title="Bedtime" value={`${metrics.sleepConsistencyScore(records)}%`} subtitle="lower variance wins" icon="☾" tint={palette.indigo} />
              <MetricCard title="Wake" value={`${metrics.wakeConsistencyScore(records)}%`} subtitle="morning variance" icon="☀" tint={palette.orange} />
              <MetricCard title="Accuracy" value={`${metrics.scheduleAccuracyScore(records)}%`} subtitle="target match" icon="◎" tint={palette.green} />
              <MetricCard title="Trend" value={formatPercent(durationTrend)} subtitle="recent duration" icon="↗" tint={(durationTrend ?? 0) >= 0 ? palette.green : palette.red} />
            </MetricGrid>
            {consistencySeries.some((point) => point.sleepConsistency != null) ? (
              <RollingConsistencyChart series={consistencySeries} />
            ) : (
              <InlineEmpty title="Need more nights" subtitle="Regularity rolling charts need at least a week of completed sleep logs." />
            )}
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Regularity Components" subtitle="Switch between the timing filters to inspect the source of your score." compact />
            <SegmentedPills options={regularityOptions} value={regComp} onChange={setRegComp} />
            <RegularityComponentsChart series={consistencySeries} component={regComp} />
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Recovery" subtitle="Cumulative sleep debt against your configured target duration." compact />
            <CumulativeDebtChart series={debtSeries} />
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Behavior Patterns" subtitle="Weekday averages, weekend shifts, and duration distribution." compact />
            <WeekdayAverageChart days={weekdayAverages} />
            <MetricGrid>
              <MetricCard title="Weekdays" value={formatHoursCompact(weekdayAverage)} subtitle="Mon-Fri average" icon="M" tint={palette.cyan} />
              <MetricCard title="Weekend" value={formatHoursCompact(weekendAverage)} subtitle="Sat-Sun average" icon="S" tint={palette.pink} />
              <MetricCard title="Social Jetlag" value={socialJetlag.deltaHours == null ? "-" : formatHoursCompact(Math.abs(socialJetlag.deltaHours))} subtitle="midpoint shift" icon="⇄" tint={palette.orange} />
              <MetricCard title="Median" value={formatHoursCompact(medianDuration)} subtitle="middle night" icon="◇" tint={palette.green} />
            </MetricGrid>
            <DurationDistributionChart buckets={durationBuckets} />
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Nerd Stats" subtitle="Deeper scoring outputs from the sleep analyzer." compact />
            <SleepAlignmentChart series={alignmentSeries} />
            <MetricGrid>
              <MetricCard title="Latest Score" value={latestScore ? `${latestScore.dailyScore}%` : "-"} subtitle="alignment" icon="◎" tint={palette.green} />
              <MetricCard title="Core Score" value={latestScore ? `${latestScore.coreScore}%` : "-"} subtitle="duration + consistency" icon="◒" tint={palette.cyan} />
              <MetricCard title="Phase" value={latestScore ? `${latestScore.phaseScore}%` : "-"} subtitle="midpoint match" icon="◌" tint={palette.indigo} />
              <MetricCard title="Timing" value={latestScore ? `${latestScore.timingScore}%` : "-"} subtitle="bed/wake targets" icon="⌁" tint={palette.orange} />
            </MetricGrid>
            <TwilightButton title="Timing Timeline" subtle onPress={() => router.push("/modals/timing-sheet")} />
          </GlassPanel>
        </>
      )}
    </NativeScreen>
  );
}
