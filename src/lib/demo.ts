import demoBackup from "../../assets/demo-backup.json";

import { getDemoRestoreState, setDemoRestoreState } from "@/lib/db";
import { exportArchiveJson, importArchiveJson, restoreFromBackupJson } from "@/lib/archive";

export async function importDemoData() {
  const backupArchiveJson = await exportArchiveJson();
  await setDemoRestoreState({
    backupArchiveJson,
    backupCreatedAt: new Date().toISOString(),
    isDemoActive: true,
  });
  await importArchiveJson(JSON.stringify(demoBackup));
  await setDemoRestoreState({
    backupArchiveJson,
    backupCreatedAt: new Date().toISOString(),
    isDemoActive: true,
  });
}

export async function exitDemoData() {
  const restore = await getDemoRestoreState();
  if (restore.backupArchiveJson) {
    await restoreFromBackupJson(restore.backupArchiveJson);
  }
  await setDemoRestoreState({
    backupArchiveJson: null,
    backupCreatedAt: null,
    isDemoActive: false,
  });
}
