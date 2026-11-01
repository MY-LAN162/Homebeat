// Chạy nền trên máy bố mẹ (Android / iPhone): khoảng 15 phút một lần, tùy hệ điều hành cho phép.
// Không chạy trong Expo Go; cần bản cài (EAS build).
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkAndAlert } from './checkAndAlert';

export const BACKGROUND_TASK = 'an-tam-chay-nen';

// Phải khai báo ngay khi nạp app (không đặt trong màn hình nào).
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await checkAndAlert();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Bật / tắt chạy nền. Trả về false nếu điện thoại không cho phép chạy nền. */
export async function setBackgroundEnabled(on: boolean): Promise<boolean> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK);
    if (!on) {
      if (registered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK);
      return true;
    }
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    if (!registered) await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: 15 });
    return true;
  } catch {
    return false;
  }
}
