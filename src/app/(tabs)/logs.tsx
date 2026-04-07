import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

import {
  AppScreen,
  EmptyState,
  GlassCard,
  PrimaryButton,
  SectionTitle,
  SessionRow,
} from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/format";
import { getTheme } from "@/lib/theme";
import { selectSleepProfile, useAppStore } from "@/lib/store";

export default function LogsRoute() {
  const appearance = useAppStore((state) => state.appearance);
  const sessions = useAppStore((state) => state.sessions);
  const removeSleepLog = useAppStore((state) => state.removeSleepLog);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepProfile = useAppStore(selectSleepProfile);
  const theme = getTheme(appearance);

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

  if (!sleepProfile) {
    return (
      <AppScreen>
        <EmptyState title="Logs unavailable" subtitle="Create or recover a sleep profile to unlock sleep logs." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <SectionTitle title="Sleep Logs" subtitle="Edit the nights Twilight uses for scoring, streaks, and long-range analytics." />

      <PrimaryButton
        title="Add Sleep Log"
        onPress={() => router.push(`/modals/session-editor?profileId=${sleepProfile.id}`)}
        icon="＋"
      />

      {profileSessions.length === 0 ? (
        <EmptyState title="No sleep logs yet" subtitle="Your completed nights will appear here, and you can also add manual logs." />
      ) : (
        <View className="gap-3">
          {profileSessions.map((session) => {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime!);
            return (
              <GlassCard key={session.id}>
                <View className="gap-3">
                  <SessionRow
                    title={end.toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    subtitle={`${formatTime(start)} → ${formatTime(end)}`}
                    duration={formatDuration((end.getTime() - start.getTime()) / 1000)}
                    onPress={() =>
                      router.push(`/modals/session-editor?profileId=${sleepProfile.id}&sessionId=${session.id}`)
                    }
                  />
                  <View className="flex-row gap-3">
                    <PrimaryButton
                      title="Edit"
                      subtle
                      onPress={() =>
                        router.push(`/modals/session-editor?profileId=${sleepProfile.id}&sessionId=${session.id}`)
                      }
                    />
                    <PrimaryButton
                      title="Delete"
                      subtle
                      onPress={() => void removeSleepLog(session.id)}
                    />
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      )}

      <Text style={{ color: theme.textSecondary }} className="text-center text-sm">
        Wake-day semantics apply: each session is attributed to the day you woke up.
      </Text>
    </AppScreen>
  );
}
