import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { formatDay, formatDuration, formatTime } from "@/lib/format";
import { selectSleepProfile, useAppStore } from "@/lib/store";
import { NativeFieldGroup, NativeFieldSection, NativeRow } from "@/ui/native";
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

export default function LogsRoute() {
  const sessions = useAppStore((state) => state.sessions);
  const removeSleepLog = useAppStore((state) => state.removeSleepLog);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepProfile = useAppStore(selectSleepProfile);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

  useEffect(() => {
    setLastViewedTab("logs").catch(() => undefined);
  }, [setLastViewedTab]);

  const profileSessions = useMemo(
    () =>
      sleepProfile
        ? sessions
            .filter((session) => session.blockedProfileId === sleepProfile.id && session.endTime)
            .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime())
        : [],
    [sessions, sleepProfile],
  );

  const totalHours = profileSessions.reduce((sum, session) => {
    const end = new Date(session.endTime!).getTime();
    const start = new Date(session.startTime).getTime();
    return sum + Math.max(0, end - start) / 3_600_000;
  }, 0);

  if (!sleepProfile) {
    return (
      <NativeScreen>
        <EmptyPanel title="Logs unavailable" subtitle="Create or recover a sleep profile to unlock sleep logs." />
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <SectionHeader
        title="Sleep Logs"
        subtitle="Edit the nights Twilight uses for scoring, streaks, and long-range analytics."
        trailing={
          <Text onPress={() => router.push(`/modals/session-editor?profileId=${sleepProfile.id}`)}>
            <Ionicons name="add-circle" size={26} color={theme.accent} />
          </Text>
        }
      />

      <GlassPanel style={{ gap: 14 }}>
        <MetricGrid>
          <MetricCard title="Logs" value={`${profileSessions.length}`} subtitle="completed nights" icon="☾" tint={palette.cyan} />
          <MetricCard title="Banked" value={`${Math.round(totalHours)}h`} subtitle="total sleep" icon="Σ" tint={palette.green} />
        </MetricGrid>
        <TwilightButton title="Add Sleep Log" onPress={() => router.push(`/modals/session-editor?profileId=${sleepProfile.id}`)} />
      </GlassPanel>

      {profileSessions.length === 0 ? (
        <EmptyPanel title="No sleep logs yet" subtitle="Your completed nights will appear here, and you can also add manual logs." />
      ) : (
        <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
          <NativeFieldGroup>
            <NativeFieldSection footer="Wake-day semantics apply: each session belongs to the day you woke up.">
              {profileSessions.map((session) => {
                const start = new Date(session.startTime);
                const end = new Date(session.endTime!);
                const duration = formatDuration((end.getTime() - start.getTime()) / 1000);
                return (
                  <View key={session.id} style={{ paddingHorizontal: 10 }}>
                    <Pressable
                      onPress={() =>
                        router.push(`/modals/session-editor?profileId=${sleepProfile.id}&sessionId=${session.id}`)
                      }
                      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                    >
                      <NativeRow
                        title={formatDay(end)}
                        subtitle={`${formatTime(start)} -> ${formatTime(end)} · ${session.tag}`}
                        trailing={
                          <View style={{ alignItems: "flex-end", gap: 5 }}>
                            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
                              {duration}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                          </View>
                        }
                      />
                    </Pressable>
                    <View style={{ flexDirection: "row", gap: 8, paddingBottom: 10 }}>
                      <TwilightButton
                        title="Edit"
                        subtle
                        style={{ flex: 1, minHeight: 38, borderRadius: 14, paddingVertical: 8 }}
                        textStyle={{ fontSize: 13 }}
                        onPress={() =>
                          router.push(`/modals/session-editor?profileId=${sleepProfile.id}&sessionId=${session.id}`)
                        }
                      />
                      <TwilightButton
                        title="Delete"
                        subtle
                        danger
                        style={{ flex: 1, minHeight: 38, borderRadius: 14, paddingVertical: 8 }}
                        textStyle={{ fontSize: 13 }}
                        onPress={() => void removeSleepLog(session.id)}
                      />
                    </View>
                  </View>
                );
              })}
            </NativeFieldSection>
          </NativeFieldGroup>
        </GlassPanel>
      )}
    </NativeScreen>
  );
}
