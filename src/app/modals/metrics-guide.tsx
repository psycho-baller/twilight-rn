import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppScreen, GlassCard, PrimaryButton, SectionTitle } from "@/components/ui";
import { getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

export default function MetricsGuideModal() {
  const appearance = useAppStore((state) => state.appearance);
  const theme = getTheme(appearance);

  return (
    <AppScreen>
      <SectionTitle title="Metrics Guide" subtitle="How Twilight reads your nights and scores your rhythm." />
      <GlassCard>
        <View className="gap-4">
          {[
            "Sleep consistency measures bedtime stability.",
            "Wake consistency measures wake-time stability.",
            "Accuracy compares actual bedtime and wake time with your configured targets.",
            "Moving averages smooth short-term noise into a more useful trend.",
            "Sleep debt accumulates the gap between your goal duration and actual sleep each night.",
          ].map((item) => (
            <Text key={item} style={{ color: theme.textPrimary }} className="text-base leading-7">
              • {item}
            </Text>
          ))}
        </View>
      </GlassCard>
      <PrimaryButton title="Close" onPress={() => router.back()} />
    </AppScreen>
  );
}
