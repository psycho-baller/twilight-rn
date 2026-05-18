import { TurboModuleRegistry } from "react-native";

import * as FallbackCharts from "@/charts/fallback";

type ChartModule = typeof FallbackCharts;

function hasSkiaModule() {
  if ((globalThis as { SkiaApi?: unknown }).SkiaApi) {
    return true;
  }

  try {
    return Boolean(TurboModuleRegistry.get("RNSkiaModule"));
  } catch {
    return false;
  }
}

function loadCharts(): ChartModule {
  if (!hasSkiaModule()) {
    return FallbackCharts;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./skia") as ChartModule;
  } catch (error) {
    if (__DEV__) {
      console.warn("Falling back to non-Skia charts until the Android dev client is rebuilt.", error);
    }
    return FallbackCharts;
  }
}

const Charts = loadCharts();

export const CumulativeDebtChart = Charts.CumulativeDebtChart;
export const DurationDistributionChart = Charts.DurationDistributionChart;
export const DurationMomentumChart = Charts.DurationMomentumChart;
export const MovingAverageChart = Charts.MovingAverageChart;
export const RegularityComponentsChart = Charts.RegularityComponentsChart;
export const RollingConsistencyChart = Charts.RollingConsistencyChart;
export const SleepAlignmentChart = Charts.SleepAlignmentChart;
export const SleepWindowDialChart = Charts.SleepWindowDialChart;
export const TimingTimelineChart = Charts.TimingTimelineChart;
export const TrendSparkline = Charts.TrendSparkline;
export const TrendsAnalysisCard = Charts.TrendsAnalysisCard;
export const WeekdayAverageChart = Charts.WeekdayAverageChart;
export const WeeklySleepWindowChart = Charts.WeeklySleepWindowChart;
