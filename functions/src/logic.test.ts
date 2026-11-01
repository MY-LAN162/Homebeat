// Chạy: npm test (trong thư mục functions)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertsToPush, buildAppData, checkAttempts, checkPairingDoc, MAX_ATTEMPTS, sosMessage, WINDOW_MS } from './logic';

const NOW = new Date(2026, 9, 1, 11, 0);
const member = { id: 'bo', name: 'Hùng', call: 'Bố' as const, self: 'Con' as const };

test('gửi cảnh báo trễ thuốc và chưa điểm danh một lần mỗi ngày, không gửi mức thông tin', () => {
  const data = buildAppData({
    members: [member],
    medications: [{ id: 'a', memberId: 'bo', name: 'Amlodipin', pillsPerDose: 1, times: ['07:00'], stockPills: 2 }],
    checkins: [],
    doseLogs: [],
  });
  const first = alertsToPush(data, NOW, new Set());
  assert.deepEqual(first.map((x) => x.alert.kind).sort(), ['late-dose', 'no-checkin']);
  const again = alertsToPush(data, NOW, new Set(first.map((x) => x.key)));
  assert.equal(again.length, 0);
});

test('không gửi "mất tín hiệu"', () => {
  const data = buildAppData({ members: [member], heartbeats: { bo: { at: new Date(NOW.getTime() - 10 * 3600_000).toISOString() } } });
  data.settings.checkinBy = '23:59';
  assert.equal(alertsToPush(data, NOW, new Set()).length, 0);
});

test('nội dung SOS có link vị trí', () => {
  const m = sosMessage(member, { id: 's', memberId: 'bo', at: NOW.toISOString(), cancelled: false, lat: 21.03, lng: 105.85 });
  assert.match(m.title, /SOS/);
  assert.match(m.body, /maps\.google\.com\/\?q=21\.03,105\.85/);
});

test('giới hạn số lần nhập mã', () => {
  let s;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const r = checkAttempts(s, 1000);
    assert.equal(r.allowed, true);
    s = r.next;
  }
  assert.equal(checkAttempts(s, 1000).allowed, false);
  assert.equal(checkAttempts(s, 1000 + WINDOW_MS + 1).allowed, true);
});

test('kiểm tra mã kết nối', () => {
  const doc = { familyId: 'f', memberId: 'bo', expiresAt: new Date(NOW.getTime() + 3600_000).toISOString() };
  assert.deepEqual(checkPairingDoc('12a456', doc, NOW), { ok: false, code: 'invalid-argument' });
  assert.deepEqual(checkPairingDoc('123456', undefined, NOW), { ok: false, code: 'not-found' });
  assert.deepEqual(checkPairingDoc('123456', doc, new Date(NOW.getTime() + 2 * 3600_000)), { ok: false, code: 'failed-precondition' });
  assert.deepEqual(checkPairingDoc('123456', doc, NOW), { ok: true, familyId: 'f', memberId: 'bo' });
});
