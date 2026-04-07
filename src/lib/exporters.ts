import { formatDuration } from "@/lib/format";
import { sessionDurationSeconds } from "@/lib/sleep";
import type { BlockedProfile, BlockedProfileSession } from "@/lib/types";

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

export function exportSessionsCsv(sessions: BlockedProfileSession[], profiles: BlockedProfile[], local = false) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const lines = ["session_id,profile_name,start_time,end_time,break_start_time,break_end_time"];

  for (const session of sessions) {
    const profileName = profilesById.get(session.blockedProfileId)?.name ?? "Unknown";
    lines.push(
      [
        session.id,
        profileName,
        iso(session.startTime, local),
        iso(session.endTime, local),
        iso(session.breakStartTime, local),
        iso(session.breakEndTime, local),
      ]
        .map((field) => escapeCsv(String(field)))
        .join(","),
    );
  }

  return lines.join("\n");
}

export function exportSessionsMarkdown(
  sessions: BlockedProfileSession[],
  profiles: BlockedProfile[],
  local = false,
) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const completed = sessions.filter((session) => session.endTime);
  const totalDuration = completed.reduce((sum, session) => sum + sessionDurationSeconds(session), 0);

  const lines: string[] = [
    "# Twilight Sleep Tracker — Data Export",
    "",
    "> Structured sleep session data exported from the Twilight Android clone.",
    "",
    "## Export Metadata",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Generated At | ${new Date().toISOString()} |`,
    `| Timezone | ${local ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"} |`,
    `| Profiles Included | ${profiles.length} |`,
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
    const profileName = profilesById.get(session.blockedProfileId)?.name ?? "Unknown";
    const breakDuration =
      session.breakStartTime && session.breakEndTime
        ? formatDuration(
            (new Date(session.breakEndTime).getTime() - new Date(session.breakStartTime).getTime()) / 1000,
          )
        : "—";

    lines.push(`### Session ${index + 1} — ${profileName}`);
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|-------|-------|");
    lines.push(`| Status | ${session.endTime ? "✅ Completed" : "🔴 In Progress"} |`);
    lines.push(`| Session ID | \`${session.id}\` |`);
    lines.push(`| Start Time | ${iso(session.startTime, local)} |`);
    lines.push(`| End Time | ${session.endTime ? iso(session.endTime, local) : "—"} |`);
    lines.push(`| Duration | ${session.endTime ? formatDuration(sessionDurationSeconds(session)) : "—"} |`);
    lines.push(`| Break Start | ${session.breakStartTime ? iso(session.breakStartTime, local) : "—"} |`);
    lines.push(`| Break End | ${session.breakEndTime ? iso(session.breakEndTime, local) : "—"} |`);
    lines.push(`| Break Duration | ${breakDuration} |`);
    lines.push("");
  });

  return lines.join("\n");
}
