import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput } from "react-native";

import { SleepWindowDialChart } from "@/charts";
import { formatClock, formatDay, formatDurationLong, minutesFromDate, startOfDay } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import {
  GlassPanel,
  MetricCard,
  MetricGrid,
  NativeScreen,
  SectionHeader,
  TwilightButton,
  chartPalette,
  useTwilightTheme,
} from "@/ui/surface";

function applyMinutesToDate(baseDate: Date, totalMinutes: number) {
  const next = new Date(baseDate);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

export default function SessionEditorModal() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const sessions = useAppStore((state) => state.sessions);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const upsertSleepLog = useAppStore((state) => state.upsertSleepLog);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

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
  const durationSeconds = Math.max(0, (wakeDate.getTime() - sleepDate.getTime()) / 1000);
  const averageGoalDeviationMinutes = Math.round(
    (Math.min(Math.abs(sleepMinutes - sleepSettings.optimalSleepMinutes), 24 * 60 - Math.abs(sleepMinutes - sleepSettings.optimalSleepMinutes)) +
      Math.min(Math.abs(wakeMinutes - sleepSettings.optimalWakeMinutes), 24 * 60 - Math.abs(wakeMinutes - sleepSettings.optimalWakeMinutes))) /
      2,
  );
  const goalMatchScore = Math.max(0, 100 - Math.round((averageGoalDeviationMinutes / 60) * 30));

  async function save() {
    await upsertSleepLog({
      id: existing?.id,
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
    <NativeScreen>
      <SectionHeader
        title={existing ? "Edit Log" : "Log Sleep"}
        subtitle="Wake day drives the calendar day, matching Twilight’s sleep semantics."
      />

      <GlassPanel style={{ gap: 14 }}>
        <SectionHeader title="Wake Day" subtitle="The night is attributed to the day you woke up." compact />
        <TwilightButton
          title={formatDay(sessionDay)}
          subtle
          onPress={() => setShowDatePicker(true)}
        />
        {showDatePicker ? <DateTimePicker value={sessionDay} mode="date" onChange={onDateChange} /> : null}
        <MetricGrid>
          <MetricCard title="Goal Match" value={`${goalMatchScore}%`} subtitle={`${averageGoalDeviationMinutes}m avg drift`} icon="◎" tint={goalMatchScore >= 80 ? palette.green : palette.orange} />
          <MetricCard title="Duration" value={formatDurationLong(durationSeconds)} subtitle="sleep window" icon="◒" tint={palette.cyan} />
        </MetricGrid>
      </GlassPanel>

      <SleepWindowDialChart
        sleepMinutes={sleepMinutes}
        wakeMinutes={wakeMinutes}
        onSleepChange={setSleepMinutes}
        onWakeChange={setWakeMinutes}
      />

      <GlassPanel style={{ gap: 14 }}>
        <SectionHeader title="Timing" subtitle="Circular picker values translated into exact session timestamps." compact />
        <MetricGrid>
          <MetricCard title="Bedtime" value={formatClock(sleepMinutes)} subtitle={formatDay(sleepDate)} icon="☾" tint={palette.indigo} />
          <MetricCard title="Wake" value={formatClock(wakeMinutes)} subtitle={formatDay(wakeDate)} icon="☀" tint={palette.orange} />
        </MetricGrid>
        <TextInput
          value={tag}
          placeholder="Manual Log"
          placeholderTextColor={theme.textSecondary}
          onChangeText={setTag}
          style={{
            minHeight: 50,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.outline,
            backgroundColor: theme.cardMuted,
            color: theme.textPrimary,
            paddingHorizontal: 14,
            fontSize: 15,
          }}
        />
      </GlassPanel>

      <GlassPanel style={{ gap: 10 }}>
        <TwilightButton title="Save Log" onPress={() => void save()} />
        <TwilightButton title="Cancel" subtle onPress={() => router.back()} />
        <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
          Goal match is derived from your configured bedtime and wake-time targets.
        </Text>
      </GlassPanel>
    </NativeScreen>
  );
}
