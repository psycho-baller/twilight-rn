import { Host } from "@expo/ui";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { SleepWindowDialChart } from "@/charts";
import { DEFERRED_FEATURE_MESSAGE, STRATEGIES } from "@/lib/constants";
import { formatClock } from "@/lib/format";
import { ensureNotificationPermission } from "@/lib/notifications";
import { selectDemoMode, selectSleepProfile, useAppStore } from "@/lib/store";
import type { BlockedProfile, BlockingStrategyId, ColorPalette, ThemeMode } from "@/lib/types";
import {
  NativeActionButton,
  NativeFieldGroup,
  NativeFieldSection,
  NativeRow,
  NativeSegmentedControl,
  NativeSwitchRow,
  NativeTextField,
} from "@/ui/native";
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

const weekdayLabels = [
  { value: 1, label: "S" },
  { value: 2, label: "M" },
  { value: 3, label: "T" },
  { value: 4, label: "W" },
  { value: 5, label: "T" },
  { value: 6, label: "F" },
  { value: 7, label: "S" },
];

const themeModes: ThemeMode[] = ["System", "Sunset", "Night Sky"];
const palettes: ColorPalette[] = ["Twilight", "Amethyst"];

export default function SettingsRoute() {
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepProfile = useAppStore(selectSleepProfile);

  useEffect(() => {
    setLastViewedTab("settings").catch(() => undefined);
  }, [setLastViewedTab]);

  if (!sleepProfile) {
    return (
      <NativeScreen>
        <EmptyPanel
          title="Settings unavailable"
          subtitle="Twilight needs a sleep profile before it can save strategy, reminder, and theme settings."
        />
      </NativeScreen>
    );
  }

  return <SettingsForm key={`${sleepProfile.id}-${sleepProfile.updatedAt}`} sleepProfile={sleepProfile} />;
}

function SettingsForm({ sleepProfile }: { sleepProfile: BlockedProfile }) {
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const appearance = useAppStore((state) => state.appearance);
  const updateAppearance = useAppStore((state) => state.updateAppearance);
  const updateSleepSettings = useAppStore((state) => state.updateSleepSettings);
  const createOrUpdateProfile = useAppStore((state) => state.createOrUpdateProfile);
  const exitDemoMode = useAppStore((state) => state.exitDemoMode);
  const isDemoMode = useAppStore(selectDemoMode);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

  const [name, setName] = useState(sleepProfile.name);
  const [domainsText, setDomainsText] = useState((sleepProfile.domains ?? []).join("\n"));
  const [selectedStrategy, setSelectedStrategy] = useState<BlockingStrategyId>(sleepProfile.blockingStrategyId ?? "ManualBlockingStrategy");
  const [breaksEnabled, setBreaksEnabled] = useState(Boolean(sleepProfile.enableBreaks));
  const [breakMinutes, setBreakMinutes] = useState(sleepProfile.breakTimeInMinutes ?? 15);
  const [strictMode, setStrictMode] = useState(Boolean(sleepProfile.enableStrictMode));
  const [allowMode, setAllowMode] = useState(Boolean(sleepProfile.enableAllowMode));
  const [allowDomainsMode, setAllowDomainsMode] = useState(Boolean(sleepProfile.enableAllowModeDomains));
  const [safariBlocking, setSafariBlocking] = useState(Boolean(sleepProfile.enableSafariBlocking ?? true));
  const [useSleepSchedule, setUseSleepSchedule] = useState(Boolean(sleepProfile.useSleepSchedule));
  const [windDownReminderEnabled, setWindDownReminderEnabled] = useState(sleepSettings.windDownReminderEnabled);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(sleepSettings.healthSyncEnabled);
  const [scheduleDays, setScheduleDays] = useState<number[]>(sleepProfile.schedule?.days ?? []);

  const strategy = useMemo(
    () => STRATEGIES.find((item) => item.id === selectedStrategy),
    [selectedStrategy],
  );

  async function saveProfile() {
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
    <NativeScreen>
      <SectionHeader
        title="Settings"
        subtitle="Sleep profile controls, Android-core deferred surfaces, appearance, reminders, and data tools."
      />

      <GlassPanel style={{ gap: 14 }}>
        <SectionHeader title="Sleep Goal" subtitle="These targets power scoring, reminders, charts, and the log editor." compact />
        <MetricGrid>
          <MetricCard title="Bedtime" value={formatClock(sleepSettings.optimalSleepMinutes)} subtitle="target" icon="☾" tint={palette.indigo} />
          <MetricCard title="Wake" value={formatClock(sleepSettings.optimalWakeMinutes)} subtitle="target" icon="☀" tint={palette.orange} />
        </MetricGrid>
        <SleepWindowDialChart
          sleepMinutes={sleepSettings.optimalSleepMinutes}
          wakeMinutes={sleepSettings.optimalWakeMinutes}
          onSleepChange={(minutes) => void updateSleepSettings({ optimalSleepMinutes: minutes })}
          onWakeChange={(minutes) => void updateSleepSettings({ optimalWakeMinutes: minutes })}
        />
      </GlassPanel>

      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Profile" footer="Manual strategy executes in phase 1. NFC and QR strategies stay visible but are deferred on Android.">
            <NativeTextField title="Profile name" value={name} onChangeText={setName} placeholder="Sleep" />
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Strategy" subtitle="Original strategy IDs, descriptions, and parity states are preserved." compact />
        {STRATEGIES.map((item) => {
          const active = item.id === selectedStrategy;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedStrategy(item.id)}
              style={({ pressed }) => ({
                borderRadius: 20,
                borderWidth: 1,
                borderColor: active ? item.accent : theme.outline,
                backgroundColor: active ? `${item.accent}22` : theme.cardMuted,
                padding: 14,
                opacity: pressed ? 0.75 : 1,
                gap: 6,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "900" }}>{item.name}</Text>
                  <Text style={{ color: theme.textSecondary, marginTop: 4, fontSize: 12, lineHeight: 17 }}>{item.description}</Text>
                </View>
                <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={21} color={active ? item.accent : theme.textSecondary} />
              </View>
              {!item.executableInPhaseOne ? (
                <Text style={{ color: theme.warning, fontSize: 12, fontWeight: "800" }}>Android-core deferred</Text>
              ) : null}
            </Pressable>
          );
        })}
      </GlassPanel>

      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Breaks & safeguards" footer={DEFERRED_FEATURE_MESSAGE}>
            <NativeSwitchRow title="Enable breaks" value={breaksEnabled} onValueChange={setBreaksEnabled} />
            <NativeRow
              title="Break duration"
              subtitle={`${breakMinutes} minutes`}
              trailing={
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TwilightButton
                    title="-5"
                    subtle
                    style={{ minHeight: 34, minWidth: 48, borderRadius: 13, paddingVertical: 6 }}
                    textStyle={{ fontSize: 13 }}
                    onPress={() => setBreakMinutes(Math.max(5, breakMinutes - 5))}
                  />
                  <TwilightButton
                    title="+5"
                    subtle
                    style={{ minHeight: 34, minWidth: 48, borderRadius: 13, paddingVertical: 6 }}
                    textStyle={{ fontSize: 13 }}
                    onPress={() => setBreakMinutes(Math.min(60, breakMinutes + 5))}
                  />
                </View>
              }
            />
            <NativeSwitchRow title="Strict mode" subtitle="Stored but not enforced in phase 1." value={strictMode} onValueChange={setStrictMode} />
            <NativeSwitchRow title="Allow mode" subtitle="Stored but not enforced in phase 1." value={allowMode} onValueChange={setAllowMode} />
            <NativeSwitchRow title="Domain allow mode" subtitle="Stored but not enforced in phase 1." value={allowDomainsMode} onValueChange={setAllowDomainsMode} />
            <NativeSwitchRow title="Browser blocking" subtitle="Stored but not enforced in phase 1." value={safariBlocking} onValueChange={setSafariBlocking} />
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Web Domains" subtitle="Editable now, app and domain enforcement later." compact />
        <TextInput
          value={domainsText}
          multiline
          placeholder="youtube.com\nreddit.com"
          placeholderTextColor={theme.textSecondary}
          onChangeText={setDomainsText}
          style={{
            minHeight: 120,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.outline,
            backgroundColor: theme.cardMuted,
            color: theme.textPrimary,
            padding: 14,
            textAlignVertical: "top",
            fontSize: 14,
            lineHeight: 20,
          }}
        />
      </GlassPanel>

      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Sleep schedule" footer="Schedule settings are saved for parity. Android enforcement is phase 2.">
            <NativeSwitchRow title="Use sleep schedule" value={useSleepSchedule} onValueChange={setUseSleepSchedule} />
            <Host matchContents>
              <View style={{ paddingHorizontal: 10, paddingVertical: 8, gap: 10 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}>ACTIVE DAYS</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                        style={{
                          height: 42,
                          width: 42,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 21,
                          borderWidth: 1,
                          borderColor: active ? theme.accent : theme.outline,
                          backgroundColor: active ? theme.accent : theme.cardMuted,
                        }}
                      >
                        <Text style={{ color: active ? "#06131B" : theme.textPrimary, fontSize: 14, fontWeight: "900" }}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Host>
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="NFC & QR Shortcuts" subtitle="Visible for parity, intentionally deferred." compact />
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
          The six non-manual strategies keep their names and settings surface. Native NFC reads, QR scanning, shortcut
          deep links, and app-block enforcement remain behind Android adapters for phase 2.
        </Text>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Appearance" subtitle="Same palette and theme-mode vocabulary as the SwiftUI app." compact />
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}>THEME MODE</Text>
        <NativeSegmentedControl options={themeModes} value={appearance.themeMode} onChange={(value) => void updateAppearance({ themeMode: value })} />
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}>PALETTE</Text>
        <NativeSegmentedControl options={palettes} value={appearance.colorPalette} onChange={(value) => void updateAppearance({ colorPalette: value })} />
      </GlassPanel>

      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Notifications">
            <NativeSwitchRow
              title="Wind-down reminder"
              subtitle="Schedules a daily reminder three hours before bedtime."
              value={windDownReminderEnabled}
              onValueChange={setWindDownReminderEnabled}
            />
          </NativeFieldSection>
          <NativeFieldSection title="Health Connect" footer="The iOS Apple Health surface maps to this Android placeholder until Health Connect lands in phase 2.">
            <NativeSwitchRow title="Health sync" value={healthSyncEnabled} onValueChange={setHealthSyncEnabled} />
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>

      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Community & data">
            <NativeActionButton title="Support Twilight" onPress={() => router.push("/modals/support")} />
            <NativeActionButton title="Import & Export Data" onPress={() => router.push("/modals/data-management")} />
            <NativeActionButton title="Emergency Access" onPress={() => router.push("/modals/emergency")} />
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>

      {isDemoMode ? (
        <GlassPanel style={{ gap: 12 }}>
          <SectionHeader title="Demo Data" subtitle="Exit demo mode from inside Settings so it never obscures toolbar actions." compact />
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
            Exiting demo mode restores the backup created before the sample import.
          </Text>
          <TwilightButton title="Exit Demo and Restore Previous Data" onPress={() => void exitDemoMode()} />
        </GlassPanel>
      ) : null}

      <GlassPanel style={{ gap: 8 }}>
        <SectionHeader title="Development" subtitle="Android-core placeholders for non-phase-1 native integrations." compact />
        <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>
          Widgets, tiles, quick controls, app links for sleep mode, native app pickers, NFC read/write, QR scanning,
          Health Connect sync, review prompts, IAP, and app blocking enforcement are deferred behind adapters.
        </Text>
      </GlassPanel>

      <TwilightButton
        title={`Save ${strategy?.executableInPhaseOne ? "Changes" : "Parity Surface"}`}
        onPress={() => void saveProfile()}
      />
    </NativeScreen>
  );
}
