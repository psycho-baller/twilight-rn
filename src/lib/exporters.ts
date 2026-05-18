import { formatDuration } from "@/lib/format";
import { sessionDurationSeconds } from "@/lib/sleep";
import type { SleepSession } from "@/lib/types";

function escapeCsv(field: string) {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function iso(date: string | null, local = false) {
  if (!date) return "";
  if (!local) return new Date(date).toISOString();
  return new Date(date).toLocaleString();
}

export function exportSessionsCsv(sessions: SleepSession[], local = false) {
  const lines = ["session_id,tag,start_time,end_time"];

  for (const session of sessions) {
    lines.push(
      [
        session.id,
        session.tag,
        iso(session.startTime, local),
        iso(session.endTime, local),
      ]
        .map((field) => escapeCsv(String(field)))
        .join(","),
    );
  }

  return lines.join("\n");
}

export function exportSessionsMarkdown(
  sessions: SleepSession[],
  local = false,
) {
  const completed = sessions.filter((session) => session.endTime);
  const totalDuration = completed.reduce((sum, session) => sum + sessionDurationSeconds(session), 0);

  const lines: string[] = [
    "# Twilight Sleep Tracker — Data Export",
    "",
    "> Structured sleep session data exported from the Twilight app.",
    "",
    "## Export Metadata",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Generated At | ${new Date().toISOString()} |`,
    `| Timezone | ${local ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"} |`,
    `| Total Sessions | ${sessions.length} |`,
    `| Completed Sessions | ${completed.length} |`,
    `| Total Sleep Time | ${formatDuration(totalDuration)} |`,
    "",
    "## Session Log",
    "",
  ];

  if (sessions.length === 0) {
    lines.push("_No sessions to display._");
    return lines.join("\n");
  }

  sessions.forEach((session, index) => {
    lines.push(`### Session ${index + 1} — ${session.tag}`);
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|-------|-------|");
    lines.push(`| Status | ${session.endTime ? "✅ Completed" : "🔴 In Progress"} |`);
    lines.push(`| Session ID | \`${session.id}\` |`);
    lines.push(`| Start Time | ${iso(session.startTime, local)} |`);
    lines.push(`| End Time | ${session.endTime ? iso(session.endTime, local) : "—"} |`);
    lines.push(`| Duration | ${session.endTime ? formatDuration(sessionDurationSeconds(session)) : "—"} |`);
    lines.push("");
  });

  return lines.join("\n");
}
