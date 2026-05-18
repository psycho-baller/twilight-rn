import { router } from "expo-router";
import { useMemo } from "react";
import { Text } from "react-native";

import { TimingTimelineChart } from "@/charts";
import { formatClock } from "@/lib/format";
import { buildSleepMetrics } from "@/lib/sleep";
import { selectSleepProfile, useAppStore } from "@/lib/store";
import {
  EmptyPanel,
  GlassPanel,
  MetricCard,
  MetricGrid,
  NativeScreen,
  SectionHeader,
  TwilightButton,
  chartPalette,
  useTwilightTheme,
} from "@/ui/surface";

export default function TimingSheetModal() {
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const sleepProfile = useAppStore(selectSleepProfile);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

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
  const records = metrics.recordsInRange("90D");
  const timeline = metrics.timingTimelineSeries(records);
  const socialJetlag = metrics.socialJetlag(records);

  return (
    <NativeScreen>
      <SectionHeader title="Timing Timeline" subtitle="How Twilight interprets bedtime, wake time, midpoint, and wake-day semantics." />

      {timeline.length === 0 ? (
        <EmptyPanel title="No timing data yet" subtitle="Complete sleep logs to unlock the timing timeline." />
      ) : (
        <>
          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Bedtime Trend" subtitle="Offsets are normalized from 6 PM so overnight sleep windows remain continuous." compact />
            <TimingTimelineChart series={timeline} />
          </GlassPanel>

          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Timing Targets" subtitle="Swift-compatible target values used by regularity and alignment scores." compact />
            <MetricGrid>
              <MetricCard title="Target Bed" value={formatClock(sleepSettings.optimalSleepMinutes)} subtitle="configured" icon="☾" tint={palette.indigo} />
              <MetricCard title="Target Wake" value={formatClock(sleepSettings.optimalWakeMinutes)} subtitle="configured" icon="☀" tint={palette.orange} />
              <MetricCard title="Social Jetlag" value={socialJetlag.deltaHours == null ? "-" : `${Math.abs(socialJetlag.deltaHours).toFixed(1)}h`} subtitle="weekday/weekend midpoint" icon="⇄" tint={palette.pink} />
              <MetricCard title="Nights" value={`${records.length}`} subtitle="90-day timing sample" icon="◎" tint={palette.green} />
            </MetricGrid>
          </GlassPanel>
        </>
      )}

      <GlassPanel style={{ gap: 10 }}>
        <SectionHeader
          title="Wake-Day Semantics"
          subtitle="Each sleep session belongs to the day you woke up on. If bedtime is after noon, Twilight treats it as the night before the selected wake day."
          compact
        />
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>
          This keeps overnight sessions, manual logs, charts, streaks, and backup imports aligned with the SwiftUI app.
        </Text>
      </GlassPanel>

      <TwilightButton title="Close" onPress={() => router.back()} />
    </NativeScreen>
  );
}
