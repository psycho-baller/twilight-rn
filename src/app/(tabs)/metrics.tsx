import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  AppScreen,
  BarChart,
  EmptyState,
  GlassCard,
  MiniTrendChart,
  PrimaryButton,
  SectionTitle,
  SegmentedControl,
  StatGrid,
} from "@/components/ui";
import { formatHours } from "@/lib/format";
import { buildSleepMetrics } from "@/lib/sleep";
import { getTheme } from "@/lib/theme";
import type { SleepMetricsRange } from "@/lib/types";
import { selectSleepProfile, useAppStore } from "@/lib/store";

export default function MetricsRoute() {
  const [range, setRange] = useState<SleepMetricsRange>("90D");
  const appearance = useAppStore((state) => state.appearance);
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepProfile = useAppStore(selectSleepProfile);
  const theme = getTheme(appearance);

  useEffect(() => {
    setLastViewedTab("metrics").catch(() => undefined);
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
  const records = metrics.recordsInRange(range);
  const movingAverageSeries = metrics.movingAverageSeries(records, 7);
  const consistencySeries = metrics.rollingConsistencySeries(records, 14);
  const debtSeries = metrics.cumulativeDebtSeries(records);
  const weekdayAverages = metrics.weekdayAverages(records);
  const durationBuckets = metrics.durationBuckets(records);
  const trendPeriods = metrics.durationTrendsAnalysis();

  if (!sleepProfile) {
    return (
      <AppScreen>
        <EmptyState
          title="Metrics unavailable"
          subtitle="Complete onboarding and create a sleep profile to unlock long-range analytics."
        />
      </AppScreen>
    );
  }

  if (records.length === 0) {
    return (
      <AppScreen>
        <EmptyState
          title="Not enough nights for metrics yet"
          subtitle="Track a few nights and this tab will unlock trends, regularity, recovery, and long-range sleep patterns."
        />
      </AppScreen>
    );
  }

  const consistencyComposite = consistencySeries.map((item) =>
    item.sleepConsistency && item.wakeConsistency && item.scheduleAccuracy
      ? (item.sleepConsistency + item.wakeConsistency + item.scheduleAccuracy) / 3
      : 0,
  );

  return (
    <AppScreen>
      <SectionTitle
        title="Sleep Intelligence"
        subtitle="Long-range sleep and wake insights from your full history."
        trailing={
          <Pressable onPress={() => router.push("/modals/metrics-guide")}>
            <Text style={{ color: theme.textSecondary }} className="text-sm">
              Guide
            </Text>
          </Pressable>
        }
      />

      <SegmentedControl options={["30D", "90D", "1Y", "All"]} value={range} onChange={setRange} />

      <GlassCard>
        <SectionTitle title="Overview" />
        <View className="mt-4">
          <StatGrid
            items={[
              {
                label: "Average",
                value: formatHours(metrics.averageDuration(records) ?? 0),
                helper: "per night",
              },
              {
                label: "Median",
                value: formatHours(metrics.medianDuration(records) ?? 0),
                helper: "middle night",
              },
              {
                label: "Goal hit",
                value: `${metrics.goalHitRate(records)}%`,
                helper: "within 45m",
              },
              {
                label: "Coverage",
                value: `${metrics.trackingCoverage(records, range)}%`,
                helper: "tracked nights",
              },
            ]}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Composite regularity" subtitle="Bedtime, wake-time, and target accuracy blended into one line." />
        <View className="mt-4 gap-4">
          <MiniTrendChart values={consistencyComposite} />
          <StatGrid
            items={[
              {
                label: "Sleep",
                value: `${metrics.sleepConsistencyScore(records)}%`,
              },
              {
                label: "Wake",
                value: `${metrics.wakeConsistencyScore(records)}%`,
              },
              {
                label: "Accuracy",
                value: `${metrics.scheduleAccuracyScore(records)}%`,
              },
              {
                label: "Trend",
                value:
                  metrics.durationTrendPercent(records) == null
                    ? "—"
                    : `${Math.round(metrics.durationTrendPercent(records) ?? 0)}%`,
              },
            ]}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="7-night moving average" subtitle="Smooths noisy nightly sleep swings into a usable trend." />
        <View className="mt-4 gap-4">
          <MiniTrendChart
            values={movingAverageSeries.map((point) => point.movingAverageHours ?? 0)}
          />
          <PrimaryButton title="Timing details" subtle onPress={() => router.push("/modals/timing-sheet")} />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Sleep debt" subtitle="Target duration versus what you actually banked each night." />
        <View className="mt-4">
          <MiniTrendChart values={debtSeries.map((point) => point.cumulativeHours)} />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Weekday patterns" subtitle="Average sleep duration by wake day." />
        <View className="mt-4">
          <BarChart
            values={weekdayAverages.map((day) => day.averageHours)}
            labels={weekdayAverages.map((day) => day.dayName)}
            formatLabel={(value) => value.toFixed(1)}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Duration buckets" subtitle="How often you land in each sleep band." />
        <View className="mt-4">
          <BarChart
            values={durationBuckets.map((bucket) => bucket.count)}
            labels={durationBuckets.map((bucket) => bucket.label)}
            formatLabel={(value) => `${value}`}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Trend periods" subtitle="Short, medium, and long-term duration momentum." />
        <View className="mt-4">
          <StatGrid
            items={trendPeriods.map((period) => ({
              label: `${period.days}d`,
              value: period.averageDuration == null ? "—" : formatHours(period.averageDuration),
              helper:
                period.changePercent == null ? "Need more data" : `${Math.round(period.changePercent)}% vs previous`,
            }))}
          />
        </View>
      </GlassCard>
    </AppScreen>
  );
}
