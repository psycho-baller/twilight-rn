import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { SleepWindowDialChart } from "@/charts";
import { formatClock } from "@/lib/format";
import { ensureNotificationPermission } from "@/lib/notifications";
import { selectDemoMode, useAppStore } from "@/lib/store";
import type { ColorPalette, ThemeMode } from "@/lib/types";
import {
  NativeActionButton,
  NativeFieldGroup,
  NativeFieldSection,
  NativeSegmentedControl,
  NativeSwitchRow,
} from "@/ui/native";
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

const themeModes: ThemeMode[] = ["System", "Sunset", "Night Sky"];
const palettes: ColorPalette[] = ["Twilight", "Amethyst"];

export default function SettingsRoute() {
  const setLastViewedTab = useAppStore((state) => state.setLastViewedTab);
  const sleepSettings = useAppStore((state) => state.sleepSettings);
  const appearance = useAppStore((state) => state.appearance);
  const updateAppearance = useAppStore((state) => state.updateAppearance);
  const updateSleepSettings = useAppStore((state) => state.updateSleepSettings);
  const exitDemoMode = useAppStore((state) => state.exitDemoMode);
  const isDemoMode = useAppStore(selectDemoMode);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);

  const [windDownReminderEnabled, setWindDownReminderEnabled] = useState(sleepSettings.windDownReminderEnabled);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(sleepSettings.healthSyncEnabled);

  useEffect(() => {
    setLastViewedTab("settings").catch(() => undefined);
  }, [setLastViewedTab]);

  async function saveSettings() {
    if (windDownReminderEnabled) {
      await ensureNotificationPermission();
    }

    await updateSleepSettings({
      windDownReminderEnabled,
      healthSyncEnabled,
    });
  }

  return (
    <NativeScreen>
      <SectionHeader
        title="Settings"
        subtitle="Configure your sleep goals, app appearance, and data tools."
      />

      <GlassPanel style={{ gap: 14 }}>
        <SectionHeader title="Sleep Goal" subtitle="These targets power scoring, reminders, and charts." compact />
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

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Appearance" subtitle="Customize the look and feel of Twilight." compact />
        <View style={{ gap: 10 }}>
          <NativeSegmentedControl options={themeModes} value={appearance.themeMode} onChange={(value) => void updateAppearance({ themeMode: value })} />
          <NativeSegmentedControl options={palettes} value={appearance.colorPalette} onChange={(value) => void updateAppearance({ colorPalette: value })} />
        </View>
      </GlassPanel>

      <NativeFieldGroup>
        <NativeFieldSection title="Notifications">
          <NativeSwitchRow
            title="Wind-down reminder"
            subtitle="Schedules a daily reminder before bedtime."
            value={windDownReminderEnabled}
            onValueChange={setWindDownReminderEnabled}
          />
        </NativeFieldSection>
        <NativeFieldSection title="Health Sync">
          <NativeSwitchRow title="Sync with Apple Health" value={healthSyncEnabled} onValueChange={setHealthSyncEnabled} />
        </NativeFieldSection>
      </NativeFieldGroup>

      <NativeFieldGroup>
        <NativeFieldSection title="Community & data">
          <NativeActionButton title="Support Twilight" onPress={() => router.push("/modals/support")} />
          <NativeActionButton title="Import & Export Data" onPress={() => router.push("/modals/data-management")} />
        </NativeFieldSection>
      </NativeFieldGroup>

      {isDemoMode ? (
        <GlassPanel style={{ gap: 12 }}>
          <SectionHeader title="Demo Data" subtitle="Exit demo mode and restore your data." compact />
          <TwilightButton title="Exit Demo and Restore Previous Data" onPress={() => void exitDemoMode()} />
        </GlassPanel>
      ) : null}

      <TwilightButton
        title="Save Changes"
        onPress={() => void saveSettings()}
      />
    </NativeScreen>
  );
}
