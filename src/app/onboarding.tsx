import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  AppScreen,
  GlassCard,
  PrimaryButton,
  SectionTitle,
  SegmentedControl,
  SleepWindowDial,
} from "@/components/ui";
import { createSleepProfile } from "@/lib/db";
import { ensureNotificationPermission } from "@/lib/notifications";
import { getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

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
  const appearance = useAppStore((state) => state.appearance);
  const importDemoMode = useAppStore((state) => state.importDemoMode);
  const theme = getTheme(appearance);
  const stepIndex = steps.indexOf(step);

  const action = useMemo(() => {
    if (stepIndex === steps.length - 1) {
      return "Finish";
    }
    return "Continue";
  }, [stepIndex]);

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
    <AppScreen>
      <SectionTitle
        title="Twilight"
        subtitle="A simple sleep tracker that actually works, rebuilt for Android with the full in-app phase 1 surface."
        trailing={
          <Text style={{ color: theme.textSecondary }} className="text-sm">
            {stepIndex + 1}/{steps.length}
          </Text>
        }
      />

      <SegmentedControl
        options={[...steps]}
        value={step}
        onChange={setStep}
      />

      {step === "Welcome" ? (
        <GlassCard>
          <Text style={{ color: theme.textPrimary }} className="text-4xl font-bold">
            Good night, Android.
          </Text>
          <Text style={{ color: theme.textSecondary }} className="mt-4 text-base leading-7">
            Twilight keeps sleep tracking local, visual, and brutally honest. This build mirrors the iOS app’s in-app
            experience first, then layers in Android-native integrations later.
          </Text>
        </GlassCard>
      ) : null}

      {step === "Tracking" ? (
        <GlassCard>
          <SectionTitle title="Health & tracking" subtitle="Manual sessions, sleep logs, analytics, backups, and demo mode all work in phase 1." />
          <View className="mt-4 gap-3">
            {[
              "Weekly and long-range sleep analytics",
              "Editable sleep logs with wake-day semantics",
              "Backup, restore, CSV export, and AI-friendly Markdown export",
              "Emergency unblock, reminders, and theme customization",
            ].map((item) => (
              <Text key={item} style={{ color: theme.textPrimary }} className="text-base">
                • {item}
              </Text>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {step === "Health" ? (
        <GlassCard>
          <SectionTitle title="Health Connect" subtitle="Deferred in phase 1" />
          <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
            Apple Health sync is preserved as a first-class surface in the design, but Android Health Connect wiring is
            intentionally deferred to phase 2. Your sleep data still stays fully local and exportable.
          </Text>
        </GlassCard>
      ) : null}

      {step === "Schedule" ? (
        <View className="gap-4">
          <SectionTitle title="Set your rhythm" subtitle="Choose the sleep and wake targets used throughout charts, streaks, and log scoring." />
          <SleepWindowDial
            sleepMinutes={sleepMinutes}
            wakeMinutes={wakeMinutes}
            onSleepChange={setSleepMinutes}
            onWakeChange={setWakeMinutes}
          />
        </View>
      ) : null}

      {step === "Notifications" ? (
        <GlassCard>
          <SectionTitle title="Notifications" subtitle="Twilight can schedule daily wind-down reminders and session reminders." />
          <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
            We’ll ask for permission next so the app can nudge you three hours before bedtime and remind you when a
            break is almost over.
          </Text>
        </GlassCard>
      ) : null}

      {step === "NFC" ? (
        <GlassCard>
          <SectionTitle title="NFC & QR shortcuts" subtitle="Deferred in Android core" />
          <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
            The full strategy model remains in the app, including NFC and QR-based wake/sleep controls. The Android
            core release stores those settings now and enables the native triggers in phase 2.
          </Text>
        </GlassCard>
      ) : null}

      {step === "Demo" ? (
        <View className="gap-4">
          <GlassCard>
            <SectionTitle title="Explore the app" subtitle="Load sample data to see the full dashboard before your own history exists." />
            <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
              Demo mode imports a realistic backup, powers the metrics tab immediately, and keeps a full backup of your
              previous local state so you can exit safely later.
            </Text>
          </GlassCard>

          <PrimaryButton title="Explore demo data" onPress={() => finish(true)} icon="✨" />
        </View>
      ) : null}

      <View className="gap-3">
        <PrimaryButton title={action} onPress={() => void next()} />
        {stepIndex > 0 ? (
          <Pressable onPress={() => setStep(steps[stepIndex - 1])}>
            <Text style={{ color: theme.textSecondary }} className="text-center text-sm">
              Back
            </Text>
          </Pressable>
        ) : null}
      </View>
    </AppScreen>
  );
}
