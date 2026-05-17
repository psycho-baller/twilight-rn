import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  AppScreen,
  DurationBadge,
  EmptyState,
  GlassCard,
  PrimaryButton,
  SectionTitle,
  SegmentedControl,
  StatGrid,
} from "@/components/ui";
import { formatDuration, formatHours, formatSignedHours } from "@/lib/format";
import { getSleepGreeting, processWeeklySleepData, buildSleepMetrics } from "@/lib/sleep";
import { getTheme } from "@/lib/theme";
import { selectSleepProfile, useAppStore } from "@/lib/store";

const initialNow = Date.now();

function useNow() {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = setInterval(updateNow, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const now = useNow();
  const [viewMode, setViewMode] = useState<"Week" | "7-Night Avg">("Week");
  const [greetingSeed, setGreetingSeed] = useState(0);
  const appearance = useAppStore((state) => state.appearance);
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const startProfile = useAppStore((state) => state.startProfile);
  const stopActiveSession = useAppStore((state) => state.stopActiveSession);
  const toggleBreak = useAppStore((state) => state.toggleBreak);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const theme = getTheme(appearance);
  const sleepProfile = useAppStore(selectSleepProfile);

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
  const avgSeries = useMemo(
    () => metrics.movingAverageSeries(metrics.recordsInRange("90D"), 7).filter((item) => item.movingAverageHours != null),
    [metrics],
  );
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const isSleeping = activeSession?.blockedProfileId === sleepProfile?.id;

  const greeting = getSleepGreeting(
    sleepSettings.optimalSleepMinutes,
    sleepSettings.optimalWakeMinutes,
    Boolean(isSleeping),
    new Date(now + greetingSeed),
  );

  const lastSleepSession = profileSessions
    .filter((session) => session.endTime)
    .sort((left, right) => new Date(right.endTime!).getTime() - new Date(left.endTime!).getTime())[0];
  const currentStreak = computeStreak(metrics.records.map((record) => record.date));
  const durationTrend = metrics.durationTrendPercent(metrics.recordsInRange("30D"));
  const activeDurationSeconds = activeSession
    ? Math.max(0, Math.floor((now - new Date(activeSession.startTime).getTime()) / 1000))
    : 0;
  const activeDuration = activeSession
    ? formatDuration(activeDurationSeconds)
    : null;

  return (
    <AppScreen>
      <SectionTitle
        title={greeting}
        subtitle={new Date(now).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        trailing={
          <Pressable onPress={() => setGreetingSeed((value) => value + 7_777)}>
            <Ionicons name="sparkles" size={22} color={theme.textSecondary} />
          </Pressable>
        }
      />

      {!sleepProfile ? (
        <EmptyState
          title="Sleep profile missing"
          subtitle="Finish onboarding or create a new sleep profile in Settings to unlock the full Twilight dashboard."
        />
      ) : (
        <>
          <GlassCard>
            <View className="flex-row items-center justify-between">
              <Text style={{ color: theme.textPrimary }} className="text-xl font-semibold">
                Analytics
              </Text>
              <Pressable onPress={() => router.push("/modals/metrics-guide")}>
                <Ionicons name="information-circle-outline" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View className="mt-4">
              <SegmentedControl options={["Week", "7-Night Avg"]} value={viewMode} onChange={setViewMode} />
            </View>
            <View className="mt-5">
              {viewMode === "Week" ? (
                <View className="gap-4">
                  <StatGrid
                    items={[
                      {
                        label: "Avg sleep",
                        value: formatHours(metrics.averageDuration(metrics.recordsInRange("30D")) ?? 0),
                        helper: "last 30 nights",
                      },
                      {
                        label: "Sleep cons.",
                        value: `${metrics.sleepConsistencyScore(metrics.recordsInRange("30D"))}%`,
                        helper: "bedtime rhythm",
                      },
                      {
                        label: "Wake cons.",
                        value: `${metrics.wakeConsistencyScore(metrics.recordsInRange("30D"))}%`,
                        helper: "wake rhythm",
                      },
                      {
                        label: "Accuracy",
                        value: `${metrics.scheduleAccuracyScore(metrics.recordsInRange("30D"))}%`,
                        helper: "target match",
                      },
                    ]}
                  />
                  <View className="rounded-[22px] border px-3 py-4" style={{ borderColor: theme.outline }}>
                    <View className="flex-row items-end justify-between">
                      {weeklyData.map((entry) => {
                        const height = entry.duration === 0 ? 10 : Math.max(18, (entry.duration / (10 * 3600)) * 140);
                        return (
                          <View key={entry.dayLabel} className="items-center gap-2">
                            <View
                              className="w-7 rounded-full"
                              style={{
                                height,
                                backgroundColor: entry.duration === 0 ? theme.outline : theme.accent,
                              }}
                            />
                            <Text style={{ color: theme.textSecondary }} className="text-xs">
                              {entry.dayLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : avgSeries.length === 0 ? (
                <EmptyState
                  title="Moving average locked"
                  subtitle="Track at least 7 completed nights to unlock your rolling-average sleep trend."
                />
              ) : (
                <View className="gap-4">
                  <StatGrid
                    items={[
                      {
                        label: "30D avg",
                        value: formatHours(metrics.averageDuration(metrics.recordsInRange("30D")) ?? 0),
                      },
                      {
                        label: "vs target",
                        value: formatSignedHours((metrics.averageDuration(metrics.recordsInRange("30D")) ?? 0) - metrics.targetDurationHours),
                        tone: theme.accent,
                      },
                    ]}
                  />
                  <View className="rounded-[22px] border px-3 py-4" style={{ borderColor: theme.outline }}>
                    <Text style={{ color: theme.textSecondary }} className="mb-3 text-sm">
                      7-night moving average
                    </Text>
                    <View className="flex-row items-end gap-2">
                      {avgSeries.slice(-14).map((point, index) => (
                        <View key={`${point.date.toISOString()}-${index}`} className="flex-1 items-center gap-2">
                          <View
                            className="w-full rounded-full"
                            style={{
                              height: Math.max(20, (point.movingAverageHours! / 10) * 140),
                              backgroundColor: theme.accent,
                            }}
                          />
                          <Text style={{ color: theme.textSecondary }} className="text-[10px]">
                            {point.date.toLocaleDateString([], { month: "numeric", day: "numeric" })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </GlassCard>

          <GlassCard>
            {isSleeping && activeSession ? (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text style={{ color: theme.textPrimary }} className="text-2xl font-bold">
                      😴 mode activated
                    </Text>
                    <Text style={{ color: theme.textSecondary }} className="mt-1 text-sm">
                      Dream Big!
                    </Text>
                  </View>
                  {activeDuration ? <DurationBadge seconds={activeDurationSeconds} /> : null}
                </View>

                <Text style={{ color: theme.textPrimary }} className="text-4xl font-black">
                  {activeDuration}
                </Text>

                <PrimaryButton title="Wake Up" onPress={() => void stopActiveSession()} icon="☀️" />
                {sleepProfile.enableBreaks ? (
                  <PrimaryButton title="Toggle Break" onPress={() => void toggleBreak()} subtle />
                ) : null}
              </View>
            ) : (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <View className="gap-1">
                    <Text style={{ color: theme.textPrimary }} className="text-xl font-semibold">
                      {lastSleepSession ? "Last Night's Sleep" : "Ready for tonight?"}
                    </Text>
                    <Text style={{ color: theme.textSecondary }} className="text-sm">
                      {lastSleepSession
                        ? "Consistency compounds. Keep the rhythm."
                        : "Start your first sleep session to unlock the full dashboard."}
                    </Text>
                  </View>
                  {currentStreak > 0 ? (
                    <View
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: theme.glass, borderColor: theme.outline, borderWidth: 1 }}
                    >
                      <Text style={{ color: theme.textPrimary }} className="text-sm font-semibold">
                        {currentStreak} day streak
                      </Text>
                    </View>
                  ) : null}
                </View>

                {lastSleepSession ? (
                  <StatGrid
                    items={[
                      {
                        label: "Duration",
                        value: formatDuration((new Date(lastSleepSession.endTime!).getTime() - new Date(lastSleepSession.startTime).getTime()) / 1000),
                      },
                      {
                        label: "Trend",
                        value: durationTrend == null ? "—" : `${Math.round(durationTrend)}%`,
                        tone: durationTrend != null && durationTrend >= 0 ? theme.success : theme.warning,
                      },
                    ]}
                  />
                ) : null}

                <PrimaryButton title="Go to Sleep" onPress={() => void startProfile(sleepProfile.id)} icon="🌙" />
              </View>
            )}
          </GlassCard>
        </>
      )}
    </AppScreen>
  );
}
