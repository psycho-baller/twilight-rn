import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { dateFromMinutes, formatClock, minutesFromDate } from "@/lib/format";
import { ensureNotificationPermission } from "@/lib/notifications";
import { selectDemoMode, useAppStore } from "@/lib/store";
import type { ColorPalette, ThemeMode } from "@/lib/types";
import {
  NativeSegmentedControl,
} from "@/ui/native";
import {
  GlassPanel,
  NativeScreen,
  SectionHeader,
  TwilightButton,
  chartPalette,
  useTwilightTheme,
} from "@/ui/surface";

const themeModes: ThemeMode[] = ["System", "Sunset", "Night Sky"];
const palettes: ColorPalette[] = ["Twilight", "Amethyst"];

/* ── Inline row components for settings ─────────────────────────── */

function SettingsSwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { theme } = useTwilightTheme();
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.label}>
        <Text style={[rowStyles.title, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[rowStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.outline, true: theme.accent }}
        thumbColor={Platform.OS === "ios" ? undefined : value ? theme.accent : "#f4f3f4"}
      />
    </View>
  );
}

function SettingsNavRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const { theme } = useTwilightTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, pressed && { opacity: 0.7 }]}
    >
      {icon ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            backgroundColor: `${theme.accent}22`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={16} color={theme.accent} />
        </View>
      ) : null}
      <View style={rowStyles.label}>
        <Text style={[rowStyles.title, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[rowStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

function SettingsDivider() {
  const { theme } = useTwilightTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.outline, marginLeft: 16 }} />;
}

function SettingsRowGroup({ children }: { children: React.ReactNode }) {
  const { theme } = useTwilightTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: theme.cardMuted,
        borderWidth: 1,
        borderColor: theme.outline,
        overflow: "hidden",
      }}
    >
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < items.length - 1 ? <SettingsDivider /> : null}
        </Fragment>
      ))}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 50,
  },
  label: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
});

/* ── Sleep time picker field ─────────────────────────────────────── */

function SleepTimePickerField({
  label,
  icon,
  value,
  color,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  color: string;
  onChange: (minutes: number) => void;
}) {
  const { theme } = useTwilightTheme();
  const dateValue = useMemo(() => dateFromMinutes(value), [value]);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: theme.glass,
        padding: 12,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ color, fontSize: 14 }}>{icon}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      </View>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="compact"
          minuteInterval={5}
          accentColor={color}
          onValueChange={(date) => {
            if (date) onChange(minutesFromDate(date));
          }}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setShowAndroidPicker(true)}
            style={{
              backgroundColor: `${color}22`,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: "800" }}>
              {formatClock(value)}
            </Text>
          </Pressable>
          {showAndroidPicker ? (
            <DateTimePicker
              value={dateValue}
              mode="time"
              display="spinner"
              minuteInterval={5}
              onValueChange={(date) => {
                if (date) onChange(minutesFromDate(date));
              }}
              onDismiss={() => setShowAndroidPicker(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/* ── Settings screen ────────────────────────────────────────────── */

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

  const durationMinutes = (sleepSettings.optimalWakeMinutes - sleepSettings.optimalSleepMinutes + 24 * 60) % (24 * 60);
  const durationH = Math.floor(durationMinutes / 60);
  const durationM = durationMinutes % 60;
  const healthy = durationH >= 7 && durationH <= 9;

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

      <GlassPanel style={{ gap: 16 }}>
        <SectionHeader title="Sleep Goal" subtitle="These targets power scoring, reminders, and charts." compact />

        <View style={{ alignItems: "center", gap: 4, paddingVertical: 4 }}>
          <Text
            style={{
              color: healthy ? palette.green : theme.textPrimary,
              fontSize: 38,
              fontWeight: "900",
              fontVariant: ["tabular-nums"],
            }}
          >
            {durationH}h {durationM > 0 ? `${durationM}m` : ""}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>sleep duration</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <SleepTimePickerField
            label="Bedtime"
            icon="☾"
            value={sleepSettings.optimalSleepMinutes}
            color={palette.indigo}
            onChange={(minutes) => void updateSleepSettings({ optimalSleepMinutes: minutes })}
          />
          <SleepTimePickerField
            label="Wake up"
            icon="☀"
            value={sleepSettings.optimalWakeMinutes}
            color={palette.orange}
            onChange={(minutes) => void updateSleepSettings({ optimalWakeMinutes: minutes })}
          />
        </View>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Appearance" subtitle="Customize the look and feel of Twilight." compact />
        <View style={{ gap: 10 }}>
          <NativeSegmentedControl options={themeModes} value={appearance.themeMode} onChange={(value) => void updateAppearance({ themeMode: value })} />
          <NativeSegmentedControl options={palettes} value={appearance.colorPalette} onChange={(value) => void updateAppearance({ colorPalette: value })} />
        </View>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Notifications" subtitle="Stay on track with timely reminders." compact />
        <SettingsRowGroup>
          <SettingsSwitchRow
            title="Wind-down reminder"
            subtitle="Schedules a daily reminder before bedtime."
            value={windDownReminderEnabled}
            onValueChange={setWindDownReminderEnabled}
          />
        </SettingsRowGroup>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Health Sync" subtitle="Keep your sleep data in sync with Apple Health." compact />
        <SettingsRowGroup>
          <SettingsSwitchRow
            title="Sync with Apple Health"
            subtitle="Automatically export sessions to the Health app."
            value={healthSyncEnabled}
            onValueChange={setHealthSyncEnabled}
          />
        </SettingsRowGroup>
      </GlassPanel>

      <GlassPanel style={{ gap: 12 }}>
        <SectionHeader title="Community & Data" subtitle="Support the project and manage your data." compact />
        <SettingsRowGroup>
          <SettingsNavRow
            title="Support Twilight"
            subtitle="Indie-built, community-supported."
            icon="heart"
            onPress={() => router.push("/modals/support")}
          />
          <SettingsNavRow
            title="Import & Export Data"
            subtitle="Back up or restore your sleep history."
            icon="download-outline"
            onPress={() => router.push("/modals/data-management")}
          />
        </SettingsRowGroup>
      </GlassPanel>

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
