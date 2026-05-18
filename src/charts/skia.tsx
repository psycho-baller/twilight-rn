// Skia-backed chart implementation. Import only through ./index so missing native modules can fall back.
import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  matchFont,
  Path,
  rect,
  RoundedRect,
  Skia,
  Text as SkiaText,
  vec,
} from "@shopify/react-native-skia";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { dateFromMinutes, formatClock, formatDuration, formatHours, minutesFromDate } from "@/lib/format";
import type {
  DailySleepData,
  SleepAlignmentScorePoint,
  SleepConsistencyPoint,
  SleepDebtPoint,
  SleepDurationBucket,
  SleepMovingAveragePoint,
  SleepTimingPoint,
  SleepTrendPeriod,
  SleepWeekdayAverage,
} from "@/lib/types";
import { chartPalette, GlassPanel, InsightPill, SectionHeader, useTwilightTheme } from "@/ui/surface";
import { chartBounds, clampChart, DEFAULT_FRAME, linearScale, nearestIndex, niceDomain } from "@/charts/chart-scales";

type LineDatum = {
  label: string;
  value: number;
  helper?: string;
};

type BarDatum = {
  label: string;
  value: number;
  helper?: string;
  color?: string;
};

const font11 = matchFont({ fontSize: 11, fontWeight: "500" });
const font12 = matchFont({ fontSize: 12, fontWeight: "600" });
const font13 = matchFont({ fontSize: 13, fontWeight: "700" });

function makeLinePath(points: { x: number; y: number }[]) {
  const builder = Skia.PathBuilder.Make();
  points.forEach((point, index) => {
    if (index === 0) {
      builder.moveTo(point.x, point.y);
    } else {
      builder.lineTo(point.x, point.y);
    }
  });
  return builder.build();
}

function makeAreaPath(points: { x: number; y: number }[], bottom: number) {
  if (points.length === 0) return Skia.Path.Make();
  const builder = Skia.PathBuilder.Make();
  points.forEach((point, index) => {
    if (index === 0) {
      builder.moveTo(point.x, point.y);
    } else {
      builder.lineTo(point.x, point.y);
    }
  });
  builder.lineTo(points[points.length - 1].x, bottom);
  builder.lineTo(points[0].x, bottom);
  builder.close();
  return builder.build();
}

function ChartCanvas({
  height = 210,
  children,
  onSelect,
}: {
  height?: number;
  children: (frame: typeof DEFAULT_FRAME & { width: number; height: number }) => React.ReactNode;
  onSelect?: (x: number) => void;
}) {
  const [width, setWidth] = useState(DEFAULT_FRAME.width);
  const frame = { ...DEFAULT_FRAME, width, height };

  return (
    <View
      style={{ height, width: "100%" }}
      onLayout={(event) => setWidth(Math.max(260, event.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => Boolean(onSelect)}
      onResponderGrant={(event) => onSelect?.(event.nativeEvent.locationX)}
      onResponderMove={(event) => onSelect?.(event.nativeEvent.locationX)}
    >
      <Canvas style={{ flex: 1 }}>{children(frame)}</Canvas>
    </View>
  );
}

function AxisGrid({
  frame,
  yTicks,
  yDomain,
}: {
  frame: typeof DEFAULT_FRAME & { width: number; height: number };
  yTicks: number[];
  yDomain: [number, number];
}) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const bounds = chartBounds(frame);
  return (
    <Group>
      {yTicks.map((tick) => {
        const y = linearScale(tick, yDomain, [bounds.bottom, bounds.top]);
        return (
          <Group key={tick}>
            <Line p1={vec(bounds.left, y)} p2={vec(bounds.right, y)} color={palette.grid} strokeWidth={1} />
            <SkiaText text={`${Math.round(tick)}`} x={4} y={y + 4} font={font11} color={palette.label} />
          </Group>
        );
      })}
    </Group>
  );
}

function LineChart({
  data,
  yDomain,
  yTicks,
  target,
  color,
  height = 210,
  suffix,
}: {
  data: LineDatum[];
  yDomain?: [number, number];
  yTicks?: number[];
  target?: number;
  color?: string;
  height?: number;
  suffix?: string;
}) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const tint = color ?? palette.cyan;
  const domain = yDomain ?? niceDomain(data.map((item) => item.value), [0, 10], 0.16);
  const ticks = yTicks ?? [domain[0], (domain[0] + domain[1]) / 2, domain[1]];
  const [selected, setSelected] = useState(Math.max(0, data.length - 1));

  return (
    <View style={{ gap: 8 }}>
      <ChartCanvas
        height={height}
        onSelect={(x) => {
          const pseudo = data.map((_, index) => ({ x: index }));
          const bounds = chartBounds({ ...DEFAULT_FRAME, width: 320, height });
          const relative = ((x - bounds.left) / Math.max(1, bounds.width)) * Math.max(1, data.length - 1);
          setSelected(clampChart(nearestIndex(pseudo, relative), 0, Math.max(0, data.length - 1)));
        }}
      >
        {(frame) => {
          const bounds = chartBounds(frame);
          const points = data.map((item, index) => ({
            x: linearScale(index, [0, Math.max(1, data.length - 1)], [bounds.left, bounds.right]),
            y: linearScale(item.value, domain, [bounds.bottom, bounds.top]),
          }));
          const path = makeLinePath(points);
          const area = makeAreaPath(points, bounds.bottom);
          const selectedPoint = points[selected];
          return (
            <Group>
              <AxisGrid frame={frame} yTicks={ticks} yDomain={domain} />
              {target != null ? (
                <Line
                  p1={vec(bounds.left, linearScale(target, domain, [bounds.bottom, bounds.top]))}
                  p2={vec(bounds.right, linearScale(target, domain, [bounds.bottom, bounds.top]))}
                  color="rgba(255,255,255,0.36)"
                  strokeWidth={1.5}
                />
              ) : null}
              <Path path={area} opacity={0.22}>
                <LinearGradient start={vec(0, bounds.top)} end={vec(0, bounds.bottom)} colors={[tint, "transparent"]} />
              </Path>
              <Path path={path} color={tint} style="stroke" strokeWidth={3.5} strokeCap="round" strokeJoin="round" />
              {points.map((point, index) => (
                <Circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r={index === selected ? 4.5 : 2.3} color={tint} />
              ))}
              {selectedPoint ? (
                <Group>
                  <Line p1={vec(selectedPoint.x, bounds.top)} p2={vec(selectedPoint.x, bounds.bottom)} color="rgba(255,255,255,0.23)" strokeWidth={1} />
                  <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={7} color="rgba(255,255,255,0.2)" />
                </Group>
              ) : null}
              {data.map((item, index) => {
                if (index % Math.ceil(data.length / 4) !== 0 && index !== data.length - 1) return null;
                const x = linearScale(index, [0, Math.max(1, data.length - 1)], [bounds.left, bounds.right]);
                return <SkiaText key={`${item.label}-${index}`} text={item.label} x={x - 15} y={frame.height - 9} font={font11} color={palette.label} />;
              })}
            </Group>
          );
        }}
      </ChartCanvas>
      {data[selected] ? (
        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
          {data[selected].label}: <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>{data[selected].value.toFixed(suffix === "%" ? 0 : 1)}{suffix ?? ""}</Text>
          {data[selected].helper ? ` · ${data[selected].helper}` : ""}
        </Text>
      ) : null}
    </View>
  );
}

function BarChart({
  data,
  yDomain,
  yTicks,
  height = 220,
  showValue,
}: {
  data: BarDatum[];
  yDomain?: [number, number];
  yTicks?: number[];
  height?: number;
  showValue?: (value: number) => string;
}) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const domain = yDomain ?? niceDomain(data.map((item) => item.value), [0, 10], 0.16);
  const ticks = yTicks ?? [domain[0], (domain[0] + domain[1]) / 2, domain[1]];

  return (
    <ChartCanvas height={height}>
      {(frame) => {
        const bounds = chartBounds(frame);
        const slot = bounds.width / Math.max(1, data.length);
        const barWidth = Math.max(15, Math.min(30, slot * 0.58));
        return (
          <Group>
            <AxisGrid frame={frame} yTicks={ticks} yDomain={domain} />
            {data.map((item, index) => {
              const x = bounds.left + slot * index + (slot - barWidth) / 2;
              const top = linearScale(item.value, domain, [bounds.bottom, bounds.top]);
              const barHeight = Math.max(2, bounds.bottom - top);
              return (
                <Group key={`${item.label}-${index}`}>
                  <RoundedRect x={x} y={top} width={barWidth} height={barHeight} r={5} color={item.color ?? palette.cyan} />
                  {showValue ? <SkiaText text={showValue(item.value)} x={x - 2} y={Math.max(12, top - 5)} font={font11} color={palette.text} /> : null}
                  <SkiaText text={item.label} x={x - 2} y={frame.height - 10} font={font11} color={palette.label} />
                </Group>
              );
            })}
          </Group>
        );
      }}
    </ChartCanvas>
  );
}

export function WeeklySleepWindowChart({
  data,
  optimalSleepMinutes,
  optimalWakeMinutes,
  targetDurationHours,
}: {
  data: DailySleepData[];
  optimalSleepMinutes: number;
  optimalWakeMinutes: number;
  targetDurationHours: number;
}) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const [selected, setSelected] = useState(Math.max(0, data.length - 1));
  const domain: [number, number] = [0, 16];
  const sleepTarget = ((optimalSleepMinutes / 60 + 24 - 18) % 24);
  const wakeTarget = ((optimalWakeMinutes / 60 + 24 - 18) % 24);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 7 }}>
        <InsightPill title="avg sleep" value={formatHours(targetDurationHours)} subtitle="goal duration" tint={palette.cyan} />
        <InsightPill title="bedtime" value={formatClock(optimalSleepMinutes)} subtitle="target" tint={palette.indigo} />
        <InsightPill title="wake" value={formatClock(optimalWakeMinutes)} subtitle="target" tint={palette.orange} />
        <InsightPill title="nights" value={`${data.filter((item) => item.duration > 0).length}`} subtitle="week" tint={palette.green} />
      </View>
      <ChartCanvas
        height={245}
        onSelect={(x) => {
          const bounds = chartBounds({ ...DEFAULT_FRAME, width: 320, height: 245 });
          const relative = ((x - bounds.left) / Math.max(1, bounds.width)) * Math.max(1, data.length - 1);
          setSelected(clampChart(Math.round(relative), 0, Math.max(0, data.length - 1)));
        }}
      >
        {(frame) => {
          const bounds = chartBounds(frame);
          const slot = bounds.width / Math.max(1, data.length);
          const barWidth = Math.min(25, slot * 0.56);
          return (
            <Group>
              <AxisGrid frame={frame} yTicks={[0, 4, 8, 12]} yDomain={domain} />
              {[sleepTarget, wakeTarget, targetDurationHours].map((value, index) => {
                const y = linearScale(value, domain, [bounds.bottom, bounds.top]);
                return (
                  <Line
                    key={`${value}-${index}`}
                    p1={vec(bounds.left, y)}
                    p2={vec(bounds.right, y)}
                    color={index === 0 ? palette.indigo : index === 1 ? palette.orange : "rgba(255,255,255,0.38)"}
                    strokeWidth={1.5}
                  />
                );
              })}
              {data.map((item, index) => {
                const x = bounds.left + slot * index + (slot - barWidth) / 2;
                const start = item.duration > 0 ? item.startOffset : 0;
                const end = item.duration > 0 ? item.endOffset : 0;
                const top = linearScale(Math.max(start, end), domain, [bounds.bottom, bounds.top]);
                const bottom = linearScale(Math.min(start, end), domain, [bounds.bottom, bounds.top]);
                return (
                  <Group key={`${item.dayLabel}-${index}`}>
                    <RoundedRect
                      x={x}
                      y={top}
                      width={barWidth}
                      height={Math.max(8, bottom - top)}
                      r={5}
                      color={index === selected ? palette.cyan : "rgba(0,212,255,0.78)"}
                    />
                    <SkiaText text={item.dayLabel.slice(0, 3)} x={x - 1} y={frame.height - 18} font={font11} color={palette.label} />
                    <SkiaText text={item.duration > 0 ? formatHours(item.duration / 3600) : "-"} x={x - 2} y={frame.height - 5} font={font11} color={palette.label} />
                  </Group>
                );
              })}
            </Group>
          );
        }}
      </ChartCanvas>
      {data[selected] ? (
        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
          {data[selected].dayLabel}: <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>{formatDuration(data[selected].duration)}</Text>
        </Text>
      ) : null}
    </View>
  );
}

export function DurationMomentumChart({ series, targetHours }: { series: SleepMovingAveragePoint[]; targetHours: number }) {
  const data = series
    .filter((point) => point.movingAverageHours != null)
    .map((point) => ({
      label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
      value: point.movingAverageHours ?? 0,
      helper: `${formatHours(point.durationHours)} nightly`,
    }));
  return <LineChart data={data} target={targetHours} yTicks={[6, 7, 8]} suffix="h" />;
}

export function MovingAverageChart(props: { series: SleepMovingAveragePoint[]; targetHours: number }) {
  return <DurationMomentumChart {...props} />;
}

export function RollingConsistencyChart({ series }: { series: SleepConsistencyPoint[] }) {
  const data = series
    .map((point) => {
      const values = [point.sleepConsistency, point.wakeConsistency, point.scheduleAccuracy].filter((value): value is number => value != null);
      return {
        label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
        value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      };
    })
    .filter((point) => point.value > 0);
  return <LineChart data={data} yDomain={[50, 92]} yTicks={[50, 60, 70, 80, 90]} target={80} suffix="%" />;
}

export function RegularityComponentsChart({
  series,
  component,
}: {
  series: SleepConsistencyPoint[];
  component: "All" | "Bedtime" | "Wake" | "Accuracy";
}) {
  const pick = (point: SleepConsistencyPoint) => {
    if (component === "Bedtime") return point.sleepConsistency;
    if (component === "Wake") return point.wakeConsistency;
    if (component === "Accuracy") return point.scheduleAccuracy;
    const values = [point.sleepConsistency, point.wakeConsistency, point.scheduleAccuracy].filter((value): value is number => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const data = series
    .map((point) => ({
      label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
      value: pick(point) ?? 0,
    }))
    .filter((point) => point.value > 0);
  return <LineChart data={data} yDomain={[50, 96]} yTicks={[50, 60, 70, 80, 90]} suffix="%" color={component === "Wake" ? "#FFB347" : component === "Accuracy" ? "#00FF88" : "#7B68EE"} />;
}

export function CumulativeDebtChart({ series }: { series: SleepDebtPoint[] }) {
  const data = series.map((point) => ({
    label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
    value: point.cumulativeHours,
  }));
  const domain = niceDomain(data.map((item) => item.value), [-4, 4], 0.2);
  return <LineChart data={data} yDomain={domain} yTicks={[domain[0], 0, domain[1]]} suffix="h" color="#34C759" />;
}

export function WeekdayAverageChart({ days }: { days: SleepWeekdayAverage[] }) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  return (
    <BarChart
      data={days.map((day, index) => ({
        label: day.dayName.slice(0, 3),
        value: day.averageHours,
        color: index === 0 || index === 6 ? palette.pink : palette.cyan,
      }))}
      yDomain={[0, 10]}
      yTicks={[0, 5, 10]}
      showValue={(value) => value.toFixed(1)}
    />
  );
}

export function DurationDistributionChart({ buckets }: { buckets: SleepDurationBucket[] }) {
  return (
    <BarChart
      data={buckets.map((bucket) => ({ label: bucket.label, value: Math.round(bucket.share * 100) }))}
      yDomain={[0, Math.max(40, ...buckets.map((bucket) => Math.round(bucket.share * 100)))]}
      yTicks={[0, 10, 20, 30, 40]}
      showValue={(value) => `${Math.round(value)}%`}
    />
  );
}

export function TrendSparkline({ values, color }: { values: number[]; color?: string }) {
  return <LineChart data={values.map((value, index) => ({ label: `${index + 1}`, value }))} height={54} color={color} />;
}

export function TrendsAnalysisCard({ periods }: { periods: SleepTrendPeriod[] }) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const sevenDay = periods.find((period) => period.days === 7);
  const insight = sevenDay?.averageDuration == null
    ? "Track more nights to unlock trend comparisons."
    : `Over the last 7 days, you're averaging ${formatHours(sevenDay.averageDuration)} of sleep.`;

  return (
    <GlassPanel style={{ gap: 14 }}>
      <SectionHeader title="Trends Analysis" subtitle={insight} compact />
      <View style={{ gap: 0 }}>
        <View style={{ flexDirection: "row", paddingBottom: 8 }}>
          <Text style={{ flex: 0.7, color: theme.textSecondary, fontSize: 12 }}>Period</Text>
          <Text style={{ flex: 0.85, color: theme.textSecondary, fontSize: 12 }}>Average</Text>
          <Text style={{ flex: 0.75, color: theme.textSecondary, fontSize: 12 }}>Change</Text>
          <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 12, textAlign: "right" }}>Trend</Text>
        </View>
        {periods.map((period) => {
          const positive = (period.changePercent ?? 0) >= 0;
          return (
            <View
              key={period.days}
              style={{
                minHeight: 48,
                borderTopWidth: 1,
                borderTopColor: theme.outline,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ flex: 0.7, color: theme.textSecondary, fontSize: 14 }}>{period.days}-day</Text>
              <Text style={{ flex: 0.85, color: theme.textPrimary, fontSize: 14, fontWeight: "800" }}>{period.averageDuration == null ? "-" : formatHours(period.averageDuration)}</Text>
              <Text style={{ flex: 0.75, color: positive ? palette.cyan : palette.orange, fontSize: 14, fontWeight: "800" }}>{period.changePercent == null ? "-" : `${positive ? "+" : ""}${Math.round(period.changePercent)}%`}</Text>
              <View style={{ flex: 1, height: 34 }}>
                <Sparkline values={period.sparkline} color={period.days <= 14 ? palette.indigo : palette.cyan} />
              </View>
            </View>
          );
        })}
      </View>
    </GlassPanel>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  return (
    <ChartCanvas height={34}>
      {(frame) => {
        const bounds = { left: 0, right: frame.width, top: 4, bottom: 30, width: frame.width, height: 26 };
        const domain = niceDomain(values, [0, 10], 0.12);
        const points = values.map((value, index) => ({
          x: linearScale(index, [0, Math.max(1, values.length - 1)], [bounds.left, bounds.right]),
          y: linearScale(value, domain, [bounds.bottom, bounds.top]),
        }));
        return <Path path={makeLinePath(points)} color={color} style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />;
      }}
    </ChartCanvas>
  );
}

export function SleepAlignmentChart({
  series,
  coreOnly,
}: {
  series: SleepAlignmentScorePoint[];
  coreOnly?: boolean;
}) {
  const data = series.map((point) => ({
    label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
    value: coreOnly ? point.coreScore : point.dailyScore,
    helper: `duration ${Math.round(point.durationScore)}%`,
  }));
  return <LineChart data={data} yDomain={[40, 100]} yTicks={[40, 60, 80, 100]} target={70} suffix="%" color={coreOnly ? "#00D4FF" : "#00FF88"} />;
}

export function TimingTimelineChart({ series }: { series: SleepTimingPoint[] }) {
  const data = series.map((point) => ({
    label: point.date.toLocaleDateString([], { month: "short", day: "numeric" }),
    value: point.bedtimeOffset,
    helper: `wake ${point.wakeOffset.toFixed(1)}`,
  }));
  return <LineChart data={data} yDomain={[0, 16]} yTicks={[0, 4, 8, 12, 16]} color="#7B68EE" />;
}

export function SleepWindowDialChart({
  sleepMinutes,
  wakeMinutes,
  onSleepChange,
  onWakeChange,
  size = 280,
}: {
  sleepMinutes: number;
  wakeMinutes: number;
  onSleepChange: (minutes: number) => void;
  onWakeChange: (minutes: number) => void;
  size?: number;
}) {
  const { theme } = useTwilightTheme();
  const palette = chartPalette(theme);
  const durationMinutes = (wakeMinutes - sleepMinutes + 24 * 60) % (24 * 60);
  const radius = size / 2 - 38;
  const center = size / 2;
  const sleepAngle = (sleepMinutes / (24 * 60)) * 360 - 90;
  const sweep = durationMinutes / (24 * 60) * 360;
  const arcPath = useMemo(() => {
    return Skia.PathBuilder.Make()
      .addArc(rect(center - radius, center - radius, radius * 2, radius * 2), sleepAngle, sweep)
      .build();
  }, [center, radius, sleepAngle, sweep]);
  const knob = (minutes: number) => {
    const angle = (minutes / (24 * 60)) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };
  const sleepKnob = knob(sleepMinutes);
  const wakeKnob = knob(wakeMinutes);
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  const healthy = h >= 7 && h <= 9;

  return (
    <GlassPanel style={{ alignItems: "center", gap: 14 }}>
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={center} cy={center} r={radius + 22} color="rgba(123,104,238,0.10)" />
        <Circle cx={center} cy={center} r={radius} color="rgba(255,255,255,0.08)" style="stroke" strokeWidth={38} />
        <Path path={arcPath} style="stroke" strokeWidth={38} strokeCap="round">
          <LinearGradient start={vec(sleepKnob.x, sleepKnob.y)} end={vec(wakeKnob.x, wakeKnob.y)} colors={[palette.indigo, "#f093fb", palette.orange]} />
        </Path>
        {[0, 6, 12, 18].map((hour) => {
          const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 33);
          const y = center + Math.sin(angle) * (radius + 33);
          return <SkiaText key={hour} text={hour === 0 ? "12" : `${hour}`} x={x - 7} y={y + 4} font={font12} color={palette.label} />;
        })}
        <Circle cx={sleepKnob.x} cy={sleepKnob.y} r={25} color="#F9FAFB" />
        <Circle cx={wakeKnob.x} cy={wakeKnob.y} r={25} color="#F9FAFB" />
        <SkiaText text="☾" x={sleepKnob.x - 7} y={sleepKnob.y + 8} font={font13} color={palette.indigo} />
        <SkiaText text="☀" x={wakeKnob.x - 8} y={wakeKnob.y + 7} font={font13} color={palette.orange} />
        <SkiaText text={`${h}`} x={center - 49} y={center - 3} font={matchFont({ fontSize: 46, fontWeight: "800" })} color={healthy ? palette.green : palette.text} />
        <SkiaText text="h" x={center - 11} y={center - 2} font={font13} color={palette.label} />
        <SkiaText text={`${m}`} x={center + 7} y={center - 3} font={matchFont({ fontSize: 46, fontWeight: "800" })} color={healthy ? palette.green : palette.text} />
        <SkiaText text="m" x={center + 49} y={center - 2} font={font13} color={palette.label} />
        <SkiaText text="sleep duration" x={center - 44} y={center + 24} font={font12} color={palette.label} />
      </Canvas>
      <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
        <NativeTimeControl label="Bedtime" icon="☾" value={sleepMinutes} color={palette.indigo} onChange={onSleepChange} />
        <NativeTimeControl label="Wake up" icon="☀" value={wakeMinutes} color={palette.orange} onChange={onWakeChange} />
      </View>
    </GlassPanel>
  );
}

function NativeTimeControl({
  label,
  icon,
  value,
  color,
  onChange,
}: {
  label: string;
  icon: string;
  value: number;
  color: string;
  onChange: (value: number) => void;
}) {
  const { theme } = useTwilightTheme();
  const dateValue = useMemo(() => dateFromMinutes(value), [value]);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  return (
    <View style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: color, backgroundColor: theme.glass, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ color, fontSize: 14 }}>{icon}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      </View>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={dateValue}
          mode="time"
          display="compact"
          minuteInterval={5}
          accentColor={color}
          onValueChange={(date) => {
            if (date) onChange(minutesFromDate(date));
          }}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setShowAndroidPicker(true)}
            style={{
              backgroundColor: `${color}22`,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: "800" }}>
              {formatClock(value)}
            </Text>
          </Pressable>
          {showAndroidPicker ? (
            <DateTimePicker
              value={dateValue}
              mode="time"
              display="spinner"
              minuteInterval={5}
              onValueChange={(date) => {
                if (date) onChange(minutesFromDate(date));
              }}
              onDismiss={() => setShowAndroidPicker(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
