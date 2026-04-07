import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import {
  AppScreen,
  GlassCard,
  InputRow,
  PrimaryButton,
  SectionTitle,
  SessionTimelineCard,
  SleepWindowDial,
} from "@/components/ui";
import { minutesFromDate, startOfDay, toMinutes } from "@/lib/format";
import { getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

function applyMinutesToDate(baseDate: Date, totalMinutes: number) {
  const next = new Date(baseDate);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

export default function SessionEditorModal() {
  const { profileId, sessionId } = useLocalSearchParams<{ profileId: string; sessionId?: string }>();
  const appearance = useAppStore((state) => state.appearance);
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const upsertSleepLog = useAppStore((state) => state.upsertSleepLog);
  const theme = getTheme(appearance);

  const existing = useMemo(
    () => sessions.find((session) => session.id === sessionId),
    [sessionId, sessions],
  );

  const initialWakeDate = existing?.endTime ? new Date(existing.endTime) : applyMinutesToDate(new Date(), sleepSettings.optimalWakeMinutes);
  const initialSleepDate = existing?.startTime
    ? new Date(existing.startTime)
    : (() => {
        const wakeDay = startOfDay(initialWakeDate);
        const sleepDay =
          sleepSettings.optimalSleepMinutes < 12 * 60
            ? wakeDay
            : new Date(wakeDay.getTime() - 24 * 60 * 60 * 1000);
        return applyMinutesToDate(sleepDay, sleepSettings.optimalSleepMinutes);
      })();

  const [sessionDay, setSessionDay] = useState(startOfDay(initialWakeDate));
  const [sleepMinutes, setSleepMinutes] = useState(minutesFromDate(initialSleepDate));
  const [wakeMinutes, setWakeMinutes] = useState(minutesFromDate(initialWakeDate));
  const [tag, setTag] = useState(existing?.tag ?? "Manual Log");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sleepDate = useMemo(() => {
    const base = sleepMinutes < 12 * 60 ? sessionDay : new Date(sessionDay.getTime() - 24 * 60 * 60 * 1000);
    return applyMinutesToDate(base, sleepMinutes);
  }, [sessionDay, sleepMinutes]);

  const wakeDate = useMemo(() => applyMinutesToDate(sessionDay, wakeMinutes), [sessionDay, wakeMinutes]);
  const averageGoalDeviationMinutes = Math.round(
    (Math.min(Math.abs(sleepMinutes - sleepSettings.optimalSleepMinutes), 24 * 60 - Math.abs(sleepMinutes - sleepSettings.optimalSleepMinutes)) +
      Math.min(Math.abs(wakeMinutes - sleepSettings.optimalWakeMinutes), 24 * 60 - Math.abs(wakeMinutes - sleepSettings.optimalWakeMinutes))) /
      2,
  );
  const goalMatchScore = Math.max(0, 100 - Math.round((averageGoalDeviationMinutes / 60) * 30));

  async function save() {
    await upsertSleepLog({
      id: existing?.id,
      blockedProfileId: String(profileId),
      tag,
      startTime: sleepDate.toISOString(),
      endTime: wakeDate.toISOString(),
      startTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
      endTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
      needsHealthKitSync: true,
    });
    router.back();
  }

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(false);
    if (event.type === "set" && date) {
      setSessionDay(startOfDay(date));
    }
  }

  return (
    <AppScreen>
      <SectionTitle
        title={existing ? "Edit Log" : "Log Sleep"}
        subtitle="Wake day drives the log’s calendar day, matching the iOS app’s sleep semantics."
      />

      <GlassCard>
        <View className="gap-4">
          <PrimaryButton
            title={`Wake day: ${sessionDay.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`}
            subtle
            onPress={() => setShowDatePicker(true)}
          />
          {showDatePicker ? (
            <DateTimePicker
              value={sessionDay}
              mode="date"
              onChange={onDateChange}
            />
          ) : null}
          <SessionTimelineCard bedtime={sleepDate} wake={wakeDate} goal={goalMatchScore} />
        </View>
      </GlassCard>

      <SleepWindowDial
        sleepMinutes={sleepMinutes}
        wakeMinutes={wakeMinutes}
        onSleepChange={setSleepMinutes}
        onWakeChange={setWakeMinutes}
      />

      <GlassCard>
        <InputRow
          label="Session Tag"
          value={tag}
          placeholder="Manual Log"
          onChangeText={setTag}
        />
      </GlassCard>

      <View className="gap-3">
        <PrimaryButton title="Save Log" onPress={() => void save()} />
        <PrimaryButton title="Cancel" subtle onPress={() => router.back()} />
      </View>

      <Text style={{ color: theme.textSecondary }} className="text-center text-sm">
        Goal match is derived from your configured bedtime and wake-time targets.
      </Text>
    </AppScreen>
  );
}
