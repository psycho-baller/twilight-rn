import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Text, View } from "react-native";

import { AppScreen, GlassCard, PrimaryButton, SectionTitle } from "@/components/ui";
import { getTheme } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

const links = [
  { title: "LinkedIn", url: "https://www.linkedin.com/in/rami-m" },
  { title: "Instagram", url: "https://www.instagram.com/psycho.baller" },
  { title: "YouTube", url: "https://www.youtube.com/@psycho.baller" },
  { title: "X / Twitter", url: "https://x.com/rami__maalouf" },
  { title: "GitHub", url: "https://github.com/ramimaalouf" },
];

export default function SupportModal() {
  const appearance = useAppStore((state) => state.appearance);
  const theme = getTheme(appearance);

  return (
    <AppScreen>
      <SectionTitle title="Support Twilight" subtitle="Questions, feedback, and the people behind the project." />
      <GlassCard>
        <Text style={{ color: theme.textPrimary }} className="text-lg font-semibold">
          Thank you for the support.
        </Text>
        <Text style={{ color: theme.textSecondary }} className="mt-3 text-base leading-7">
          Twilight stays free, visual, and local-first. Donations and native Android integrations are intentionally
          deferred in this phase 1 clone, but the support surface remains in the app for parity.
        </Text>
      </GlassCard>
      <GlassCard>
        <View className="gap-3">
          {links.map((item) => (
            <PrimaryButton key={item.url} title={item.title} subtle onPress={() => Linking.openURL(item.url)} />
          ))}
          <PrimaryButton title="Donate (coming soon)" subtle disabled />
        </View>
      </GlassCard>
      <PrimaryButton title="Close" onPress={() => router.back()} />
    </AppScreen>
  );
}
