import type { BlockedProfile, SleepSettings } from "@/lib/types";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

export async function ensureNotificationPermission() {
  // const settings = await Notifications.getPermissionsAsync();
  // if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
  //   return true;
  // }
  // const next = await Notifications.requestPermissionsAsync();
  return null; // next.granted;
}

export async function scheduleWindDownReminder(settings: SleepSettings) {
  // await Notifications.cancelScheduledNotificationAsync("wind-down-reminder").catch(() => undefined);
  // if (!settings.windDownReminderEnabled) return;
  // const sleepDate = dateFromMinutes(settings.optimalSleepMinutes);
  // const reminder = new Date(sleepDate);
  // reminder.setHours(sleepDate.getHours() - 3, sleepDate.getMinutes(), 0, 0);
  // await Notifications.scheduleNotificationAsync({
  //   identifier: "wind-down-reminder",
  //   content: {
  //     title: "Wind Down Time 🌙",
  //     body: "Dim the lights, put away the snacks, and let Twilight ease you toward sleep.",
  //   },
  //   trigger: {
  //     type: Notifications.SchedulableTriggerInputTypes.DAILY,
  //     hour: reminder.getHours(),
  //     minute: reminder.getMinutes(),
  //   },
  // });
}

export async function scheduleProfileReminder(profile: BlockedProfile) {
  if (!profile.reminderTimeInSeconds) return;
  // await Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: `${profile.name} time!`,
  //     body:
  //       profile.customReminderMessage && profile.customReminderMessage.trim().length > 0
  //         ? profile.customReminderMessage
  //         : `Get back to productivity by enabling ${profile.name}.`,
  //   },
  //   trigger: {
  //     type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  //     seconds: profile.reminderTimeInSeconds,
  //   },
  // });
}

export async function scheduleBreakReminder(profile: BlockedProfile) {
  const seconds = Math.max(0, profile.breakTimeInMinutes - 1) * 60;
  if (seconds <= 0) return;
  // await Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: "Break almost over!",
  //     body: `Hope you enjoyed your break, starting ${profile.name} in 1 minute.`,
  //   },
  //   trigger: {
  //     type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
  //     seconds,
  //   },
  // });
}
