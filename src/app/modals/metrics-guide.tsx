import { router } from "expo-router";
import { Text, View } from "react-native";

import { GlassPanel, NativeScreen, SectionHeader, TwilightButton, useTwilightTheme } from "@/ui/surface";

export default function MetricsGuideModal() {
  const { theme } = useTwilightTheme();

  return (
    <NativeScreen>
      <SectionHeader title="Metrics Guide" subtitle="How Twilight reads your nights and scores your rhythm." />
      <GlassPanel>
        <View style={{ gap: 14 }}>
          {[
            "Sleep consistency measures bedtime stability.",
            "Wake consistency measures wake-time stability.",
            "Accuracy compares actual bedtime and wake time with your configured targets.",
            "Moving averages smooth short-term noise into a more useful trend.",
            "Sleep debt accumulates the gap between your goal duration and actual sleep each night.",
            "Alignment score blends duration, timing, phase, and consistency into the SwiftUI-style score chart.",
          ].map((item) => (
            <Text key={item} style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 23 }}>
              • {item}
            </Text>
          ))}
        </View>
      </GlassPanel>
      <TwilightButton title="Close" onPress={() => router.back()} />
    </NativeScreen>
  );
}
