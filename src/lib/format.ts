export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toMinutes(hour: number, minute: number) {
  return clamp(hour * 60 + minute, 0, 24 * 60 - 1);
}

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function dateFromMinutes(minutes: number) {
  const clamped = clamp(minutes, 0, 24 * 60 - 1);
  const date = new Date();
  date.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
  return date;
}

export function minutesFromDate(date: Date) {
  return toMinutes(date.getHours(), date.getMinutes());
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = Math.floor(safe % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${remainder}s`;
}

export function formatDurationLong(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

export function formatHours(hours: number) {
  return `${hours.toFixed(1)}h`;
}

export function formatSignedHours(hours: number) {
  const prefix = hours > 0 ? "+" : "";
  return `${prefix}${hours.toFixed(1)}h`;
}

export function formatClock(minutes: number) {
  const value = clamp(minutes, 0, 24 * 60 - 1);
  const hour24 = Math.floor(value / 60);
  const minute = value % 60;
  let hour = hour24 % 12;
  if (hour === 0) hour = 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour}:${pad(minute)} ${suffix}`;
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeJson(value: unknown) {
  return JSON.stringify(value);
}
