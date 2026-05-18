import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { SleepWindowDialChart } from "@/charts";
import { createSleepProfile } from "@/lib/db";
import { ensureNotificationPermission } from "@/lib/notifications";
import { useAppStore } from "@/lib/store";
import {
  GlassPanel,
  MetricCard,
  MetricGrid,
  NativeScreen,
  SectionHeader,
  SegmentedPills,
  TwilightButton,
  chartPalette,
  useTwilightTheme,
} from "@/ui/surface";

const steps = [
  "Welcome",
  "Tracking",
  "Health",
  "Schedule",
  "Notifications",
  "NFC",
  "Demo",
] as const;

export default function OnboardingRoute() {
  const [step, setStep] = useState<(typeof steps)[number]>("Welcome");
  const [sleepMinutes, setSleepMinutes] = useState(22 * 60);
  const [wakeMinutes, setWakeMinutes] = useState(7 * 60);
  const updateSleepSettings = useAppStore((state) => state.updateSleepSettings);
  const importDemoMode = useAppStore((state) => state.importDemoMode);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const stepIndex = steps.indexOf(step);

  const action = useMemo(() => (stepIndex === steps.length - 1 ? "Finish" : "Continue"), [stepIndex]);

  async function finish(withDemo = false) {
    if (withDemo) {
      await updateSleepSettings({
        optimalSleepMinutes: sleepMinutes,
        optimalWakeMinutes: wakeMinutes,
        isOnboarded: true,
      });
      await importDemoMode();
      router.replace("/(tabs)/home");
      return;
    }

    const profile = await createSleepProfile();
    await updateSleepSettings({
      optimalSleepMinutes: sleepMinutes,
      optimalWakeMinutes: wakeMinutes,
      sleepProfileId: profile.id,
      isOnboarded: true,
    });
    router.replace("/(tabs)/home");
  }

  async function next() {
    if (step === "Notifications") {
      await ensureNotificationPermission();
    }

    if (stepIndex === steps.length - 1) {
      await finish(false);
      return;
    }

    setStep(steps[stepIndex + 1]);
  }

  return (
    <NativeScreen>
      <SectionHeader
        title="Twilight"
        subtitle="A local-first sleep tracker rebuilt for Android while preserving the full in-app iOS surface."
        trailing={
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: "800" }}>
            {stepIndex + 1}/{steps.length}
          </Text>
        }
      />

      <SegmentedPills options={steps} value={step} onChange={setStep} />

      {step === "Welcome" ? (
        <GlassPanel style={{ gap: 18 }}>
          <View style={{ height: 82, width: 82, borderRadius: 41, alignItems: "center", justifyContent: "center", backgroundColor: theme.glass }}>
            <Ionicons name="moon" size={42} color={theme.accent} />
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: 40, lineHeight: 44, fontWeight: "900" }}>
            Good night, Android.
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
            Twilight starts with manual sessions, sleep logs, analytics, backup, restore, reminders, and demo mode.
            Native Android integrations are layered in behind explicit adapters.
          </Text>
        </GlassPanel>
      ) : null}

      {step === "Tracking" ? (
        <GlassPanel style={{ gap: 14 }}>
          <SectionHeader title="Health & Tracking" subtitle="The phase 1 surface mirrors the SwiftUI app before native Android enforcement is added." compact />
          <MetricGrid>
            <MetricCard title="Analytics" value="Charts" subtitle="weekly and long-range" icon="↗" tint={palette.cyan} />
            <MetricCard title="Logs" value="Editable" subtitle="wake-day semantics" icon="☾" tint={palette.indigo} />
            <MetricCard title="Backup" value="JSON" subtitle="iOS-compatible archive" icon="◇" tint={palette.green} />
            <MetricCard title="Safety" value="Local" subtitle="emergency access" icon="◎" tint={palette.orange} />
          </MetricGrid>
        </GlassPanel>
      ) : null}

      {step === "Health" ? (
        <GlassPanel style={{ gap: 12 }}>
          <SectionHeader title="Health Connect" subtitle="Deferred in phase 1" compact />
          <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
            Apple Health is represented here as an Android Health Connect placeholder. Sleep data remains fully local,
            editable, and exportable until native sync ships in phase 2.
          </Text>
        </GlassPanel>
      ) : null}

      {step === "Schedule" ? (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Set Your Rhythm" subtitle="Choose the sleep and wake targets used throughout charts, streaks, and log scoring." compact />
          <SleepWindowDialChart
            sleepMinutes={sleepMinutes}
            wakeMinutes={wakeMinutes}
            onSleepChange={setSleepMinutes}
            onWakeChange={setWakeMinutes}
          />
        </View>
      ) : null}

      {step === "Notifications" ? (
        <GlassPanel style={{ gap: 12 }}>
          <SectionHeader title="Notifications" subtitle="Wind-down and session reminders are live in phase 1." compact />
          <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
            Twilight will ask for permission next so it can remind you before bedtime and when breaks are about to end.
          </Text>
        </GlassPanel>
      ) : null}

      {step === "NFC" ? (
        <GlassPanel style={{ gap: 12 }}>
          <SectionHeader title="NFC & QR Shortcuts" subtitle="Deferred in Android core" compact />
          <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
            The full strategy model remains visible, including NFC and QR sleep controls. Android-native physical
            triggers are phase 2 work; manual sessions are executable now.
          </Text>
        </GlassPanel>
      ) : null}

      {step === "Demo" ? (
        <View style={{ gap: 14 }}>
          <GlassPanel style={{ gap: 12 }}>
            <SectionHeader title="Explore the App" subtitle="Load sample data to see the full dashboard immediately." compact />
            <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
              Demo mode imports a realistic backup and keeps a restore point of your previous local state.
            </Text>
          </GlassPanel>
          <TwilightButton title="Explore demo data" onPress={() => void finish(true)} />
        </View>
      ) : null}

      <GlassPanel style={{ gap: 10 }}>
        <TwilightButton title={action} onPress={() => void next()} />
        {stepIndex > 0 ? (
          <Pressable onPress={() => setStep(steps[stepIndex - 1])} style={{ minHeight: 36, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: "800" }}>Back</Text>
          </Pressable>
        ) : null}
      </GlassPanel>
    </NativeScreen>
  );
}
