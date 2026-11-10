// Xử lý khi bố mẹ bấm vào thông báo nhắc thuốc:
//  - bấm nút "Đã uống": ghi nhận luôn, không cần tìm trong app;
//  - bấm vào thông báo: mở thẳng màn hình uống thuốc.
// Chạy cả khi app được mở lên từ thông báo (app đã tắt hẳn).
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { tookLabel } from '../domain/address';
import { slotFromNotification } from '../domain/reminders';
import { notify } from '../services/dialog';
import { TAKEN_ACTION } from '../services/notifications';
import { track } from '../services/usage';
import { useStore } from '../state/store';

type DoseData = { kind?: string; time?: string; date?: string; followUp?: number };

export function NotificationBridge() {
  const { ready, data, now, markSlot } = useStore();
  const pending = useRef<Notifications.NotificationResponse[]>([]);
  const latest = useRef({ data, now, markSlot, ready });
  useEffect(() => {
    latest.current = { data, now, markSlot, ready };
  });

  const handle = (resp: Notifications.NotificationResponse) => {
    const info = resp.notification.request.content.data as DoseData & { memberId?: string };
    // Máy con bấm vào cảnh báo (từ máy bố mẹ gửi, hoặc máy con tự báo): mở thẳng chi tiết cảnh báo.
    if (info?.kind && info.kind !== 'dose' && info.memberId && latest.current.data.role === 'child') {
      track('alert_notification_opened');
      router.push({ pathname: '/child/alert', params: { memberId: info.memberId, kind: info.kind } });
      return;
    }
    // Máy bố mẹ bấm vào lời nhắn / "con đã thấy" / nhắc lịch khám: về trang chủ (hiện to ở đầu trang).
    if (info?.kind && info.kind !== 'dose' && latest.current.data.role === 'parent') {
      router.replace('/parent');
      return;
    }
    if (info?.kind !== 'dose') return;
    const { data: d, markSlot: mark } = latest.current;
    const memberId = d.role === 'parent' ? d.currentMemberId : undefined;
    if (resp.actionIdentifier === TAKEN_ACTION && memberId) {
      const slot = slotFromNotification(d, memberId, info, new Date());
      const member = d.members.find((m) => m.id === memberId);
      if (slot) {
        mark(slot, 'taken');
        track(info.followUp ? 'dose_taken_after_followup' : 'dose_taken_from_notification');
      }
      router.replace('/parent');
      notify(slot ? 'Đã ghi nhận' : 'Đã ghi nhận từ trước', `${member ? tookLabel(member) : 'Đã uống'} · thuốc ${info.time}`);
      return;
    }
    track('dose_notification_opened');
    router.push('/parent/medicine');
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (latest.current.ready) handle(r);
      else pending.current.push(r);
    });
    // App được mở lên từ thông báo.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        pending.current.push(r);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);
    return () => sub.remove();
  }, []);

  // Đợi dữ liệu trên máy tải xong rồi mới xử lý.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      for (const r of pending.current.splice(0)) handle(r);
    }, 300);
    return () => clearTimeout(t);
  }, [ready]);

  return null;
}
