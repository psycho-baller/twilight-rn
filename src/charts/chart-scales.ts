export type ChartPoint = {
  x: number;
  y: number;
};

export type ChartFrame = {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
};

export const DEFAULT_FRAME: ChartFrame = {
  width: 320,
  height: 210,
  paddingLeft: 34,
  paddingRight: 16,
  paddingTop: 18,
  paddingBottom: 30,
};

export function chartBounds(frame: ChartFrame) {
  return {
    left: frame.paddingLeft,
    right: frame.width - frame.paddingRight,
    top: frame.paddingTop,
    bottom: frame.height - frame.paddingBottom,
    width: frame.width - frame.paddingLeft - frame.paddingRight,
    height: frame.height - frame.paddingTop - frame.paddingBottom,
  };
}

export function linearScale(value: number, domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (Math.abs(d1 - d0) < 0.0001) return (r0 + r1) / 2;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

export function niceDomain(values: number[], fallback: [number, number], pad = 0.1): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return fallback;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Math.abs(max - min) < 0.0001) {
    return [min - 1, max + 1];
  }
  const delta = (max - min) * pad;
  return [min - delta, max + delta];
}

export function nearestIndex(points: { x: number }[], x: number) {
  if (points.length === 0) return -1;
  let selected = 0;
  let distance = Math.abs(points[0].x - x);
  for (let index = 1; index < points.length; index += 1) {
    const nextDistance = Math.abs(points[index].x - x);
    if (nextDistance < distance) {
      selected = index;
      distance = nextDistance;
    }
  }
  return selected;
}

export function clampChart(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
