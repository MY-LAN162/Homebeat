// Cloud Functions của An Tâm.
//  - redeemPairingCode: máy bố mẹ đổi mã 6 số lấy quyền vào gia đình.
//  - onSosCreated: bố mẹ bấm SOS → gửi thông báo đẩy ngay cho máy các con.
//  - checkAlerts: 5 phút một lần, kiểm tra trễ thuốc / chưa điểm danh / huyết áp cao / báo không khỏe
//    và gửi thông báo đẩy cho con (mỗi cảnh báo một lần mỗi ngày). Đồng thời xóa mã kết nối hết hạn.
//
// Quy tắc cảnh báo dùng chung với app (src/domain/alerts.ts), tính theo giờ địa phương (xem tz.ts).
import './tz';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { COLLECTIONS, EVENT_COLLECTIONS, type RemoteSnapshot } from '../../src/domain/syncdiff';
import { dateKey } from '../../src/domain/time';
import type { Member, SosEvent } from '../../src/domain/types';
import { alertsToPush, buildAppData, checkAttempts, checkPairingDoc, sosMessage, type AttemptState } from './logic';
import { sendPush } from './push';

initializeApp();
const db = getFirestore();

/** Khu vực Singapore, gần Việt Nam nhất. Phải trùng EXPO_PUBLIC_FIREBASE_REGION trong app. */
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

export const redeemPairingCode = onCall<{ code?: unknown }>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập');
  const code = typeof req.data?.code === 'string' ? req.data.code.replace(/\s/g, '') : req.data?.code;

  // Giới hạn số lần thử để không dò được mã 6 số.
  const attemptRef = db.doc(`pairingAttempts/${uid}`);
  const allowed = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(attemptRef)).data() as AttemptState | undefined;
    const r = checkAttempts(cur, Date.now());
    tx.set(attemptRef, r.next);
    return r.allowed;
  });
  if (!allowed) throw new HttpsError('resource-exhausted', 'Nhập sai quá nhiều lần');

  return db.runTransaction(async (tx) => {
    const codeRef = typeof code === 'string' && /^\d{6}$/.test(code) ? db.doc(`pairingCodes/${code}`) : undefined;
    const snap = codeRef ? await tx.get(codeRef) : undefined;
    const res = checkPairingDoc(code, snap?.data() as Parameters<typeof checkPairingDoc>[1], new Date());
    if (!res.ok) throw new HttpsError(res.code, res.code);
    const famRef = db.doc(`families/${res.familyId}`);
    tx.update(famRef, { uids: FieldValue.arrayUnion(uid) });
    tx.set(famRef.collection('devices').doc(uid), { role: 'parent', memberId: res.memberId, joinedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.delete(codeRef!); // Mã chỉ dùng một lần.
    tx.delete(attemptRef);
    return { familyId: res.familyId, memberId: res.memberId };
  });
});

/** Mã nhận thông báo của các máy con trong gia đình. */
async function childTokens(famRef: DocumentReference): Promise<string[]> {
  const devices = await famRef.collection('devices').where('role', '==', 'child').get();
  return devices.docs.map((d) => d.get('pushToken') as string | undefined).filter((t): t is string => !!t);
}

async function pushToChildren(famRef: DocumentReference, title: string, body: string, data: Record<string, unknown>) {
  const tokens = await childTokens(famRef);
  if (!tokens.length) {
    logger.warn('Gia đình chưa có máy con nào nhận thông báo', { familyId: famRef.id });
    return;
  }
  const dead = await sendPush(tokens, { title, body, data });
  if (dead.length) {
    const devices = await famRef.collection('devices').where('pushToken', 'in', dead.slice(0, 30)).get();
    await Promise.all(devices.docs.map((d) => d.ref.update({ pushToken: FieldValue.delete() })));
  }
}

export const onSosCreated = onDocumentCreated('families/{familyId}/sosEvents/{sosId}', async (event) => {
  const sos = event.data?.data() as SosEvent | undefined;
  if (!sos || sos.cancelled) return;
  const famRef = db.doc(`families/${event.params.familyId}`);
  const member = (await famRef.collection('members').doc(sos.memberId).get()).data() as Member | undefined;
  const { title, body } = sosMessage(member, sos);
  await pushToChildren(famRef, title, body, { kind: 'sos', memberId: sos.memberId, sosId: sos.id });
});

/** Số ngày sự kiện cần đọc để tính cảnh báo hôm nay. */
const ALERT_EVENT_DAYS = 2;

export const checkAlerts = onSchedule({ schedule: 'every 5 minutes', timeZone: process.env.TZ }, async () => {
  const now = new Date();
  const since = new Date(now.getTime() - ALERT_EVENT_DAYS * 86400_000).toISOString();
  const families = await db.collection('families').get();

  for (const fam of families.docs) {
    try {
      const snap: RemoteSnapshot = { settings: fam.get('settings') };
      await Promise.all(
        COLLECTIONS.map(async (coll) => {
          const ref = fam.ref.collection(coll);
          const qs = EVENT_COLLECTIONS.includes(coll) ? await ref.where('at', '>=', since).get() : await ref.get();
          (snap as Record<string, unknown>)[coll] = qs.docs.map((d) => d.data());
        }),
      );
      const hbs = await fam.ref.collection('heartbeats').get();
      snap.heartbeats = Object.fromEntries(hbs.docs.map((d) => [d.id, { at: d.get('at'), battery: d.get('battery') }]));

      const data = buildAppData(snap);
      const sentRef = fam.ref.collection('sentAlerts');
      const today = dateKey(now);
      const sentToday = await sentRef.where('date', '==', today).get();
      const already = new Set(sentToday.docs.map((d) => d.id));
      for (const { key, alert } of alertsToPush(data, now, already)) {
        // create() lỗi nếu đã có → không gửi trùng khi hai lần chạy chồng nhau.
        try {
          await sentRef.doc(key).create({ date: today, kind: alert.kind, at: FieldValue.serverTimestamp() });
        } catch {
          continue;
        }
        await pushToChildren(fam.ref, alert.title, alert.detail ?? '', { kind: alert.kind, memberId: alert.memberId });
      }
    } catch (e) {
      logger.error('Lỗi kiểm tra cảnh báo', { familyId: fam.id, error: (e as Error).message });
    }
  }

  // Dọn mã kết nối hết hạn (để mã đó dùng lại được).
  const expired = await db.collection('pairingCodes').where('expiresAt', '<', now.toISOString()).limit(200).get();
  await Promise.all(expired.docs.map((d) => d.ref.delete()));
});
