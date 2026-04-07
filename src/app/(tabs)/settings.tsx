import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  AppScreen,
  EmptyState,
  GlassCard,
  InputRow,
  PrimaryButton,
  SectionTitle,
  SegmentedControl,
  SleepWindowDial,
  ToggleRow,
} from "@/components/ui";
import { DEFERRED_FEATURE_MESSAGE, STRATEGIES } from "@/lib/constants";
import { ensureNotificationPermission } from "@/lib/notifications";
import { getTheme } from "@/lib/theme";
import { selectDemoMode, selectSleepProfile, useAppStore } from "@/lib/store";

const weekdayLabels = [
  { value: 1, label: "S" },
  { value: 2, label: "M" },
  { value: 3, label: "T" },
  { value: 4, label: "W" },
  { value: 5, label: "T" },
  { value: 6, label: "F" },
  { value: 7, label: "S" },
];

export default function SettingsRoute() {
  const appearance = useAppStore((state) => state.appearance);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const updateAppearance = useAppStore((state) => state.updateAppearance);
  const updateSleepSettings = useAppStore((state) => state.updateSleepSettings);
  const createOrUpdateProfile = useAppStore((state) => state.createOrUpdateProfile);
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const exitDemoMode = useAppStore((state) => state.exitDemoMode);
  const sleepProfile = useAppStore(selectSleepProfile);
  const isDemoMode = useAppStore(selectDemoMode);
  const theme = getTheme(appearance);

  useEffect(() => {
    setLastViewedTab("settings").catch(() => undefined);
  }, [setLastViewedTab]);

  const [name, setName] = useState(sleepProfile?.name ?? "Sleep");
  const [domainsText, setDomainsText] = useState((sleepProfile?.domains ?? []).join("\n"));
  const [selectedStrategy, setSelectedStrategy] = useState(sleepProfile?.blockingStrategyId ?? "ManualBlockingStrategy");
  const [breaksEnabled, setBreaksEnabled] = useState(Boolean(sleepProfile?.enableBreaks));
  const [breakMinutes, setBreakMinutes] = useState(sleepProfile?.breakTimeInMinutes ?? 15);
  const [strictMode, setStrictMode] = useState(Boolean(sleepProfile?.enableStrictMode));
  const [allowMode, setAllowMode] = useState(Boolean(sleepProfile?.enableAllowMode));
  const [allowDomainsMode, setAllowDomainsMode] = useState(Boolean(sleepProfile?.enableAllowModeDomains));
  const [safariBlocking, setSafariBlocking] = useState(Boolean(sleepProfile?.enableSafariBlocking ?? true));
  const [useSleepSchedule, setUseSleepSchedule] = useState(Boolean(sleepProfile?.useSleepSchedule));
  const [windDownReminderEnabled, setWindDownReminderEnabled] = useState(sleepSettings.windDownReminderEnabled);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(sleepSettings.healthSyncEnabled);
  const [scheduleDays, setScheduleDays] = useState<number[]>(sleepProfile?.schedule?.days ?? []);

  const strategy = useMemo(
    () => STRATEGIES.find((item) => item.id === selectedStrategy),
    [selectedStrategy],
  );

  useEffect(() => {
    if (!sleepProfile) return;
    setName(sleepProfile.name);
    setDomainsText((sleepProfile.domains ?? []).join("\n"));
    setSelectedStrategy(sleepProfile.blockingStrategyId ?? "ManualBlockingStrategy");
    setBreaksEnabled(Boolean(sleepProfile.enableBreaks));
    setBreakMinutes(sleepProfile.breakTimeInMinutes);
    setStrictMode(Boolean(sleepProfile.enableStrictMode));
    setAllowMode(Boolean(sleepProfile.enableAllowMode));
    setAllowDomainsMode(Boolean(sleepProfile.enableAllowModeDomains));
    setSafariBlocking(Boolean(sleepProfile.enableSafariBlocking));
    setUseSleepSchedule(Boolean(sleepProfile.useSleepSchedule));
    setScheduleDays(sleepProfile.schedule?.days ?? []);
  }, [sleepProfile]);

  if (!sleepProfile) {
    return (
      <AppScreen>
        <EmptyState
          title="Settings unavailable"
          subtitle="Twilight needs a sleep profile before it can save strategy, reminder, and theme settings."
        />
      </AppScreen>
    );
  }

  async function saveProfile() {
    if (!sleepProfile) {
      return;
    }

    if (windDownReminderEnabled) {
      await ensureNotificationPermission();
    }

    await updateSleepSettings({
      windDownReminderEnabled,
      healthSyncEnabled,
    });

    await createOrUpdateProfile({
      id: sleepProfile.id,
      name,
      blockingStrategyId: selectedStrategy,
      enableBreaks: breaksEnabled,
      breakTimeInMinutes: breakMinutes,
      enableStrictMode: strictMode,
      enableAllowMode: allowMode,
      enableAllowModeDomains: allowDomainsMode,
      enableSafariBlocking: safariBlocking,
      useSleepSchedule,
      domains: domainsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      schedule: sleepProfile.schedule
        ? {
            ...sleepProfile.schedule,
            days: scheduleDays,
            updatedAt: new Date().toISOString(),
          }
        : {
            days: scheduleDays,
            startHour: 22,
            startMinute: 0,
            endHour: 7,
            endMinute: 0,
            updatedAt: new Date().toISOString(),
          },
    });
  }

  return (
    <AppScreen>
      <SectionTitle title="Settings" subtitle="Everything the iOS sleep profile screen exposes, preserved in the Android phase 1 app." />

      <GlassCard>
        <SectionTitle title="Sleep goal" subtitle="These targets power scoring, reminders, charts, and the log editor." />
        <View className="mt-4">
          <SleepWindowDial
            sleepMinutes={sleepSettings.optimalSleepMinutes}
            wakeMinutes={sleepSettings.optimalWakeMinutes}
            onSleepChange={(minutes) => void updateSleepSettings({ optimalSleepMinutes: minutes })}
            onWakeChange={(minutes) => void updateSleepSettings({ optimalWakeMinutes: minutes })}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Profile" subtitle="Core sleep-profile identity and manual blocking behavior." />
        <View className="mt-4 gap-3">
          <InputRow label="Name" value={name} onChangeText={setName} />
          <Text style={{ color: theme.textSecondary }} className="text-xs uppercase tracking-[1.4px]">
            Strategy
          </Text>
          <View className="gap-3">
            {STRATEGIES.map((item) => {
              const active = item.id === selectedStrategy;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedStrategy(item.id)}
                  className="rounded-[22px] border px-4 py-4"
                  style={{
                    backgroundColor: active ? `${item.accent}22` : theme.cardMuted,
                    borderColor: active ? item.accent : theme.outline,
                  }}
                >
                  <Text style={{ color: theme.textPrimary }} className="text-base font-semibold">
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textSecondary }} className="mt-1 text-sm leading-5">
                    {item.description}
                  </Text>
                  {!item.executableInPhaseOne ? (
                    <Text style={{ color: theme.warning }} className="mt-2 text-xs font-semibold">
                      Deferred in Android core
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Breaks & safeguards" subtitle="Stored exactly like the iOS app, but Android enforcement is intentionally deferred." />
        <View className="mt-4 gap-1">
          <ToggleRow title="Enable breaks" value={breaksEnabled} onValueChange={setBreaksEnabled} />
          <View className="flex-row gap-3">
            <PrimaryButton title="-5 min" subtle onPress={() => setBreakMinutes(Math.max(5, breakMinutes - 5))} />
            <PrimaryButton title={`Break: ${breakMinutes}m`} subtle />
            <PrimaryButton title="+5 min" subtle onPress={() => setBreakMinutes(Math.min(60, breakMinutes + 5))} />
          </View>
          <ToggleRow title="Strict mode" subtitle={DEFERRED_FEATURE_MESSAGE} value={strictMode} onValueChange={setStrictMode} />
          <ToggleRow title="Allow mode" subtitle={DEFERRED_FEATURE_MESSAGE} value={allowMode} onValueChange={setAllowMode} />
          <ToggleRow title="Allow mode for domains" subtitle={DEFERRED_FEATURE_MESSAGE} value={allowDomainsMode} onValueChange={setAllowDomainsMode} />
          <ToggleRow title="Safari / browser blocking" subtitle={DEFERRED_FEATURE_MESSAGE} value={safariBlocking} onValueChange={setSafariBlocking} />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Web domains" subtitle="Editable now, enforcement later." />
        <View className="mt-4 gap-3">
          <InputRow
            label="One domain per line"
            value={domainsText}
            multiline
            placeholder="youtube.com&#10;reddit.com"
            onChangeText={setDomainsText}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Sleep schedule" subtitle="Saved in phase 1, enforcement deferred." />
        <View className="mt-4 gap-3">
          <ToggleRow title="Use sleep schedule" value={useSleepSchedule} onValueChange={setUseSleepSchedule} />
          <View className="flex-row gap-2">
            {weekdayLabels.map((day) => {
              const active = scheduleDays.includes(day.value);
              return (
                <Pressable
                  key={`${day.value}-${day.label}`}
                  onPress={() =>
                    setScheduleDays((current) =>
                      current.includes(day.value)
                        ? current.filter((item) => item !== day.value)
                        : [...current, day.value].sort((left, right) => left - right),
                    )
                  }
                  className="h-11 w-11 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: active ? theme.accent : theme.cardMuted,
                    borderColor: active ? theme.accent : theme.outline,
                  }}
                >
                  <Text
                    style={{
                      color: active ? (appearance.themeMode === "Sunset" ? "#FFFFFF" : "#06131B") : theme.textPrimary,
                    }}
                    className="text-sm font-semibold"
                  >
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="NFC & QR shortcuts" subtitle="Visible for parity, intentionally deferred." />
        <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
          The six non-manual strategies stay in the Android clone with the same naming and settings surface. Native NFC
          and QR triggers are phase 2 work.
        </Text>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Appearance" subtitle="Same palette and theme-mode vocabulary as the Swift app." />
        <View className="mt-4 gap-4">
          <View className="gap-2">
            <Text style={{ color: theme.textSecondary }} className="text-xs uppercase tracking-[1.4px]">
              Theme mode
            </Text>
            <SegmentedControl
              options={["System", "Sunset", "Night Sky"]}
              value={appearance.themeMode}
              onChange={(value) => void updateAppearance({ themeMode: value })}
            />
          </View>
          <View className="gap-2">
            <Text style={{ color: theme.textSecondary }} className="text-xs uppercase tracking-[1.4px]">
              Palette
            </Text>
            <SegmentedControl
              options={["Twilight", "Amethyst"]}
              value={appearance.colorPalette}
              onChange={(value) => void updateAppearance({ colorPalette: value })}
            />
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Notifications" subtitle="Wind-down reminders are live in phase 1." />
        <View className="mt-4 gap-2">
          <ToggleRow
            title="Wind-down reminder"
            subtitle="Schedules a daily reminder three hours before your bedtime target."
            value={windDownReminderEnabled}
            onValueChange={setWindDownReminderEnabled}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Health Connect" subtitle="Deferred placeholder" />
        <View className="mt-4 gap-2">
          <ToggleRow
            title="Health sync"
            subtitle="The iOS Apple Health surface is preserved here, but Android Health Connect wiring lands in phase 2."
            value={healthSyncEnabled}
            onValueChange={setHealthSyncEnabled}
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Community" subtitle="Support, feedback, and social links." />
        <View className="mt-4 gap-3">
          <PrimaryButton title="Support Twilight" subtle onPress={() => router.push("/modals/support")} />
          <PrimaryButton title="Import & Export Data" subtle onPress={() => router.push("/modals/data-management")} />
          <PrimaryButton title="Emergency Access" subtle onPress={() => router.push("/modals/emergency")} />
        </View>
      </GlassCard>

      {isDemoMode ? (
        <GlassCard>
          <SectionTitle title="Demo Data" subtitle="This sample was loaded from onboarding so you could explore the app with real sleep patterns." />
          <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
            Exiting demo mode restores the backup created before the sample import.
          </Text>
          <View className="mt-4">
            <PrimaryButton title="Exit Demo and Restore Previous Data" onPress={() => void exitDemoMode()} />
          </View>
        </GlassCard>
      ) : null}

      <GlassCard>
        <SectionTitle title="Development" subtitle="Android-core placeholders for non-phase-1 native integrations." />
        <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
          Live Activities, widgets, quick controls, app links for sleep mode, native app pickers, NFC read/write, QR
          scanning, Health Connect sync, and app blocking enforcement are all explicitly deferred behind adapters.
        </Text>
      </GlassCard>

      <PrimaryButton
        title={`Save ${strategy?.executableInPhaseOne ? "Changes" : "Parity Surface"}`}
        onPress={() => void saveProfile()}
      />
    </AppScreen>
  );
}
