import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen, GlassCard, PrimaryButton, SectionTitle } from "@/components/ui";
import { getNextEmergencyResetDate, useAppStore } from "@/lib/store";
import { getTheme } from "@/lib/theme";

export default function EmergencyModal() {
  const [taps, setTaps] = useState(0);
  const appearance = useAppStore((state) => state.appearance);
  const emergency = useAppStore((state) => state.emergency);
  const checkAndResetEmergencyUnblocks = useAppStore((state) => state.checkAndResetEmergencyUnblocks);
  const emergencyUnblock = useAppStore((state) => state.emergencyUnblock);
  const theme = getTheme(appearance);
  const unlocked = taps >= 3;
  const resetDate = getNextEmergencyResetDate(emergency);

  useEffect(() => {
    checkAndResetEmergencyUnblocks().catch(() => undefined);
  }, [checkAndResetEmergencyUnblocks]);

  return (
    <AppScreen>
      <SectionTitle title="Emergency Access" subtitle="Tap the glass three times to unlock the emergency unblock button." />
      <GlassCard>
        <View className="gap-4">
          <Text style={{ color: theme.textPrimary }} className="text-5xl font-black">
            {emergency.emergencyUnblocksRemaining}
          </Text>
          <Text style={{ color: theme.textSecondary }} className="text-base leading-7">
            Emergency unblocks remaining. Reset period: {emergency.emergencyUnblocksResetPeriodInWeeks} weeks.
            {resetDate ? ` Next reset ${resetDate.toLocaleDateString()}.` : ""}
          </Text>
        </View>
      </GlassCard>

      <GlassCard>
        <View className="gap-4">
          <PrimaryButton
            title={unlocked ? "Emergency button unlocked" : `Tap to crack glass (${taps}/3)`}
            subtle
            onPress={() => setTaps((value) => Math.min(3, value + 1))}
          />
          <PrimaryButton
            title="Emergency Unblock"
            disabled={!unlocked || emergency.emergencyUnblocksRemaining <= 0}
            onPress={async () => {
              await emergencyUnblock();
              router.back();
            }}
          />
        </View>
      </GlassCard>
      <PrimaryButton title="Close" subtle onPress={() => router.back()} />
    </AppScreen>
  );
}
