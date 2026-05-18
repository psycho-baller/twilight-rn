import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Text } from "react-native";

import { NativeActionButton, NativeFieldGroup, NativeFieldSection } from "@/ui/native";
import { GlassPanel, NativeScreen, SectionHeader, TwilightButton, useTwilightTheme } from "@/ui/surface";

const links = [
  { title: "LinkedIn", url: "https://www.linkedin.com/in/rami-m" },
  { title: "Instagram", url: "https://www.instagram.com/psycho.baller" },
  { title: "YouTube", url: "https://www.youtube.com/@psycho.baller" },
  { title: "X / Twitter", url: "https://x.com/rami__maalouf" },
  { title: "GitHub", url: "https://github.com/ramimaalouf" },
];

export default function SupportModal() {
  const { theme } = useTwilightTheme();

  return (
    <NativeScreen>
      <SectionHeader title="Support Twilight" subtitle="Questions, feedback, and the people behind the project." />
      <GlassPanel>
        <Text style={{ color: theme.textPrimary, fontSize: 19, fontWeight: "900" }}>
          Thank you for the support.
        </Text>
        <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 15, lineHeight: 23 }}>
          Twilight stays free, visual, and local-first. Donations and native Android integrations are intentionally
          deferred in this phase 1 clone, but the support surface remains in the app for parity.
        </Text>
      </GlassPanel>
      <GlassPanel padded={false} style={{ paddingVertical: 8 }}>
        <NativeFieldGroup>
          <NativeFieldSection title="Community">
          {links.map((item) => (
            <NativeActionButton key={item.url} title={item.title} onPress={() => void Linking.openURL(item.url)} />
          ))}
          <NativeActionButton title="Donate (coming soon)" disabled />
          </NativeFieldSection>
        </NativeFieldGroup>
      </GlassPanel>
      <TwilightButton title="Close" onPress={() => router.back()} />
    </NativeScreen>
  );
}
