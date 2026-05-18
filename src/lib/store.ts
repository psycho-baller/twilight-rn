import { create } from "zustand";

import { DEMO_PROFILE_ID, DEFERRED_FEATURE_MESSAGE } from "@/lib/constants";
import {
  exportArchiveJson,
  importArchiveJson,
  previewArchiveImport,
} from "@/lib/archive";
import {
  createSleepProfile,
  deleteProfile,
  deleteSession,
  getHydratedState,
  getProfiles,
  makeProfile,
  makeSession,
  setAppState,
  setAppearance,
  setEmergencyState,
  setSleepSettings,
  upsertProfile,
  upsertSession,
} from "@/lib/db";
import { importDemoData, exitDemoData, isDemoProfile } from "@/lib/demo";
import { exportSessionsCsv, exportSessionsMarkdown } from "@/lib/exporters";
import {
  scheduleBreakReminder,
  scheduleProfileReminder,
  scheduleWindDownReminder,
} from "@/lib/notifications";
import { sessionDurationSeconds } from "@/lib/sleep";
import type {
  AppearanceSettings,
  BlockedProfile,
  BlockedProfileSession,
  BlockingStrategyId,
  EmergencyState,
  HydratedAppState,
  SleepSettings,
} from "@/lib/types";

type AppStore = HydratedAppState & {
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  setLastViewedTab: (tab: string) => Promise<void>;
  updateAppearance: (partial: Partial<AppearanceSettings>) => Promise<void>;
  updateSleepSettings: (partial: Partial<SleepSettings>) => Promise<void>;
  createOrUpdateProfile: (input: Partial<BlockedProfile>) => Promise<BlockedProfile>;
  removeProfile: (profileId: string) => Promise<void>;
  startProfile: (profileId: string, strategyId?: BlockingStrategyId) => Promise<void>;
  stopActiveSession: () => Promise<void>;
  toggleBreak: () => Promise<void>;
  upsertSleepLog: (input: Partial<BlockedProfileSession> & { blockedProfileId: string }) => Promise<void>;
  removeSleepLog: (sessionId: string) => Promise<void>;
  emergencyUnblock: () => Promise<void>;
  checkAndResetEmergencyUnblocks: () => Promise<void>;
  setEmergencyResetPeriod: (weeks: number) => Promise<void>;
  importDemoMode: () => Promise<void>;
  exitDemoMode: () => Promise<void>;
  exportCsv: () => Promise<string>;
  exportMarkdown: () => Promise<string>;
  exportBackup: () => Promise<string>;
  previewImport: (json: string) => Promise<Awaited<ReturnType<typeof previewArchiveImport>>>;
  importBackup: (json: string) => Promise<void>;
};

async function afterDataMutation(set: (state: Partial<AppStore>) => void) {
  const next = await getHydratedState();
  set(next);
}

function setError(set: (state: Partial<AppStore>) => void, currentErrorMessage: string) {
  set({ currentErrorMessage });
}

export const useAppStore = create<AppStore>((set, get) => ({
  ready: false,
  profiles: [],
  sessions: [],
  sleepSettings: {
    isOnboarded: false,
    optimalSleepMinutes: 22 * 60,
    optimalWakeMinutes: 7 * 60,
    sleepProfileId: null,
    windDownReminderEnabled: true,
    healthSyncEnabled: false,
  },
  appearance: {
    themeMode: "Night Sky",
    colorPalette: "Twilight",
  },
  emergency: {
    emergencyUnblocksRemaining: 3,
    emergencyUnblocksResetPeriodInWeeks: 4,
    lastEmergencyUnblocksResetDateTimestamp: 0,
  },
  demoRestore: {
    backupArchiveJson: null,
    backupCreatedAt: null,
    isDemoActive: false,
  },
  appState: {
    pendingExternalAction: null,
    lastViewedTab: "home",
  },
  activeSessionId: null,
  currentErrorMessage: null,

  async hydrate() {
    try {
      const hydrated = await getHydratedState();
      set(hydrated);
    } catch (error) {
      set({
        ready: true,
        currentErrorMessage:
          error instanceof Error
            ? `Twilight failed to load local data: ${error.message}`
            : "Twilight failed to load local data.",
      });
    }
  },

  async refresh() {
    await afterDataMutation(set);
  },

  clearError() {
    set({ currentErrorMessage: null });
  },

  async setLastViewedTab(tab) {
    await setAppState({ lastViewedTab: tab });
    set({
      appState: {
        ...get().appState,
        lastViewedTab: tab,
      },
    });
  },

  async updateAppearance(partial) {
    const appearance = await setAppearance(partial);
    set({ appearance });
  },

  async updateSleepSettings(partial) {
    const sleepSettings = await setSleepSettings(partial);
    await scheduleWindDownReminder(sleepSettings);
    set({ sleepSettings });
  },

  async createOrUpdateProfile(input) {
    const existing = input.id ? get().profiles.find((profile) => profile.id === input.id) : null;
    const base = existing ?? makeProfile({ order: get().profiles.length });
    const profile: BlockedProfile = {
      ...base,
      ...input,
      updatedAt: new Date().toISOString(),
      selectedActivity: input.selectedActivity ?? base.selectedActivity,
      schedule: input.schedule ?? base.schedule,
      domains: input.domains ?? base.domains,
    };
    await upsertProfile(profile);
    await afterDataMutation(set);
    return profile;
  },

  async removeProfile(profileId) {
    await deleteProfile(profileId);
    const sleepProfileId = get().sleepSettings.sleepProfileId;
    if (sleepProfileId === profileId) {
      const fallback = (await getProfiles())[0] ?? (await createSleepProfile());
      const settings = await setSleepSettings({
        sleepProfileId: fallback.id,
        isOnboarded: true,
      });
      set({ sleepSettings: settings });
    }
    await afterDataMutation(set);
  },

  async startProfile(profileId, strategyId) {
    const profile = get().profiles.find((item) => item.id === profileId);
    if (!profile) {
      setError(set, "Could not find the selected sleep profile.");
      return;
    }

    const selectedStrategy = strategyId ?? profile.blockingStrategyId ?? "ManualBlockingStrategy";
    if (selectedStrategy !== "ManualBlockingStrategy") {
      setError(set, DEFERRED_FEATURE_MESSAGE);
      return;
    }

    if (get().activeSessionId) {
      setError(set, "A sleep session is already active.");
      return;
    }

    const session = makeSession(profile.id, selectedStrategy);
    await upsertSession(session);
    await afterDataMutation(set);
  },

  async stopActiveSession() {
    const state = get();
    const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
    if (!activeSession) {
      setError(set, "No active session to stop.");
      return;
    }

    const updatedSession: BlockedProfileSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      endTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
      needsHealthKitSync: true,
    };
    await upsertSession(updatedSession);

    const profile = state.profiles.find((item) => item.id === updatedSession.blockedProfileId);
    if (profile) {
      await scheduleProfileReminder(profile);
    }

    await afterDataMutation(set);
    if (sessionDurationSeconds(updatedSession) < 5 * 60) {
      setError(set, "That session was too short to count as real sleep.");
    }
  },

  async toggleBreak() {
    const state = get();
    const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
    if (!activeSession) {
      setError(set, "Breaks only work while a session is active.");
      return;
    }

    const profile = state.profiles.find((item) => item.id === activeSession.blockedProfileId);
    if (!profile || !profile.enableBreaks) {
      setError(set, "Breaks are disabled for this profile.");
      return;
    }

    let next: BlockedProfileSession;
    if (activeSession.breakStartTime && !activeSession.breakEndTime) {
      next = {
        ...activeSession,
        breakEndTime: new Date().toISOString(),
        breakEndTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      next = {
        ...activeSession,
        breakStartTime: new Date().toISOString(),
        breakStartTimeZoneIdentifier: Intl.DateTimeFormat().resolvedOptions().timeZone,
        breakEndTime: null,
        breakEndTimeZoneIdentifier: null,
      };
      await scheduleBreakReminder(profile);
    }

    await upsertSession(next);
    await afterDataMutation(set);
  },

  async upsertSleepLog(input) {
    const existing = input.id ? get().sessions.find((session) => session.id === input.id) : null;
    const profile = get().profiles.find((item) => item.id === input.blockedProfileId);
    if (!profile) {
      setError(set, "The selected profile no longer exists.");
      return;
    }

    const session: BlockedProfileSession = {
      ...(existing ?? makeSession(input.blockedProfileId, "Manual Log")),
      ...input,
      tag: input.tag ?? existing?.tag ?? "Manual Log",
      blockedProfileId: input.blockedProfileId,
      startTime: input.startTime ?? existing?.startTime ?? new Date().toISOString(),
      endTime: input.endTime ?? existing?.endTime ?? null,
      startTimeZoneIdentifier:
        input.startTimeZoneIdentifier ??
        existing?.startTimeZoneIdentifier ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      endTimeZoneIdentifier:
        input.endTimeZoneIdentifier ??
        existing?.endTimeZoneIdentifier ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      needsHealthKitSync: true,
      healthKitSyncVersion: existing?.healthKitSyncVersion ?? 2,
    };

    await upsertSession(session);
    await afterDataMutation(set);
  },

  async removeSleepLog(sessionId) {
    await deleteSession(sessionId);
    await afterDataMutation(set);
  },

  async emergencyUnblock() {
    const state = get();
    await state.checkAndResetEmergencyUnblocks();
    if (get().emergency.emergencyUnblocksRemaining <= 0) {
      setError(set, "No emergency unblocks remaining.");
      return;
    }

    if (!get().activeSessionId) {
      setError(set, "No active session to unblock.");
      return;
    }

    await state.stopActiveSession();
    const emergency = await setEmergencyState({
      emergencyUnblocksRemaining: Math.max(0, get().emergency.emergencyUnblocksRemaining - 1),
    });
    set({ emergency });
  },

  async checkAndResetEmergencyUnblocks() {
    const emergency = get().emergency;
    if (emergency.lastEmergencyUnblocksResetDateTimestamp === 0) {
      const next = await setEmergencyState({
        lastEmergencyUnblocksResetDateTimestamp: Date.now(),
      });
      set({ emergency: next });
      return;
    }

    const weeksMs = emergency.emergencyUnblocksResetPeriodInWeeks * 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - emergency.lastEmergencyUnblocksResetDateTimestamp >= weeksMs) {
      const next = await setEmergencyState({
        emergencyUnblocksRemaining: 3,
        lastEmergencyUnblocksResetDateTimestamp: Date.now(),
      });
      set({ emergency: next });
    }
  },

  async setEmergencyResetPeriod(weeks) {
    const emergency = await setEmergencyState({
      emergencyUnblocksResetPeriodInWeeks: weeks,
      lastEmergencyUnblocksResetDateTimestamp: Date.now(),
    });
    set({ emergency });
  },

  async importDemoMode() {
    await importDemoData();
    await afterDataMutation(set);
    const demoSleepProfile = get().profiles.find((profile) => profile.id === DEMO_PROFILE_ID);
    if (demoSleepProfile) {
      const sleepSettings = await setSleepSettings({
        sleepProfileId: demoSleepProfile.id,
        isOnboarded: true,
      });
      set({ sleepSettings });
    }
    set({
      demoRestore: {
        ...get().demoRestore,
        isDemoActive: true,
      },
    });
  },

  async exitDemoMode() {
    await exitDemoData();
    await afterDataMutation(set);
  },

  async exportCsv() {
    return exportSessionsCsv(get().sessions, get().profiles);
  },

  async exportMarkdown() {
    return exportSessionsMarkdown(get().sessions, get().profiles);
  },

  async exportBackup() {
    return exportArchiveJson();
  },

  async previewImport(json) {
    return previewArchiveImport(JSON.parse(json));
  },

  async importBackup(json) {
    await importArchiveJson(json);
    await afterDataMutation(set);
  },
}));

export function selectSleepProfile(state: AppStore) {
  return state.profiles.find((profile) => profile.id === state.sleepSettings.sleepProfileId) ?? null;
}

export function selectDemoMode(state: AppStore) {
  return state.demoRestore.isDemoActive || isDemoProfile(state.sleepSettings.sleepProfileId);
}

export function getNextEmergencyResetDate(emergency: EmergencyState) {
  if (!emergency.lastEmergencyUnblocksResetDateTimestamp) return null;
  return new Date(
    emergency.lastEmergencyUnblocksResetDateTimestamp +
      emergency.emergencyUnblocksResetPeriodInWeeks * 7 * 24 * 60 * 60 * 1000,
  );
}
