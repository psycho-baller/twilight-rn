import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { getNextEmergencyResetDate, useAppStore } from "@/lib/store";
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

export default function EmergencyModal() {
  const [taps, setTaps] = useState(0);
  const emergency = useAppStore((state) => state.emergency);
  const checkAndResetEmergencyUnblocks = useAppStore((state) => state.checkAndResetEmergencyUnblocks);
  const emergencyUnblock = useAppStore((state) => state.emergencyUnblock);
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const unlocked = taps >= 3;
  const resetDate = getNextEmergencyResetDate(emergency);

  useEffect(() => {
    checkAndResetEmergencyUnblocks().catch(() => undefined);
  }, [checkAndResetEmergencyUnblocks]);

  return (
    <NativeScreen>
      <SectionHeader title="Emergency Access" subtitle="Tap the glass three times to unlock the emergency unblock button." />
      <GlassPanel style={{ gap: 14 }}>
        <MetricGrid>
          <MetricCard title="Remaining" value={`${emergency.emergencyUnblocksRemaining}`} subtitle="unblocks" icon="◎" tint={palette.orange} />
          <MetricCard title="Reset" value={`${emergency.emergencyUnblocksResetPeriodInWeeks}w`} subtitle="period" icon="↻" tint={palette.cyan} />
        </MetricGrid>
        <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>
            Emergency unblocks remaining. Reset period: {emergency.emergencyUnblocksResetPeriodInWeeks} weeks.
            {resetDate ? ` Next reset ${resetDate.toLocaleDateString()}.` : ""}
          </Text>
      </GlassPanel>

      <GlassPanel>
        <View style={{ gap: 10 }}>
          <TwilightButton
            title={unlocked ? "Emergency button unlocked" : `Tap to crack glass (${taps}/3)`}
            subtle
            onPress={() => setTaps((value) => Math.min(3, value + 1))}
          />
          <TwilightButton
            title="Emergency Unblock"
            disabled={!unlocked || emergency.emergencyUnblocksRemaining <= 0}
            onPress={async () => {
              await emergencyUnblock();
              router.back();
            }}
          />
        </View>
      </GlassPanel>
      <TwilightButton title="Close" subtle onPress={() => router.back()} />
    </NativeScreen>
  );
}
