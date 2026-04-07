import { router } from "expo-router";

import { AppScreen, GlassCard, PrimaryButton, SectionTitle } from "@/components/ui";

export default function TimingSheetModal() {
  return (
    <AppScreen>
      <SectionTitle title="Timing Notes" subtitle="How Twilight interprets bedtime and wake time." />
      <GlassCard>
        <SectionTitle
          title="Wake-day semantics"
          subtitle="Each sleep session belongs to the day you woke up on. The circular editor and metrics tab both use that convention."
        />
      </GlassCard>
      <GlassCard>
        <SectionTitle
          title="Overnight handling"
          subtitle="If bedtime is after noon, Twilight treats it as the night before the selected wake day. If bedtime is after midnight, it stays on the selected wake day."
        />
      </GlassCard>
      <PrimaryButton title="Close" onPress={() => router.back()} />
    </AppScreen>
  );
}
