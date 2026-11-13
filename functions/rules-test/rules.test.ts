// Kiểm thử luật bảo mật Firestore (firestore.rules) trên Firestore Emulator.
// Chạy: npm run test:rules (trong thư mục functions; cần Java và firebase-tools).
// Lưu ý: máy có trong gia đình mà không có yêu cầu vào (vd máy tạo gia đình) được coi là máy của con.
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

let env: RulesTestEnvironment;
const FAM = 'fam1';
const future = () => new Date(Date.now() + 3600_000).toISOString();
const futureMs = () => Date.now() + 3600_000;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-homebeat',
    firestore: { rules: readFileSync(resolve(__dirname, '../../../../firestore.rules'), 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'families', FAM), { ownerUid: 'con', uids: ['con', 'bo'] });
    // 'bo' là máy của bố (vào gia đình bằng mã, đã được Đồng ý).
    await setDoc(doc(ctx.firestore(), 'families', FAM, 'joinRequests', 'bo'), { uid: 'bo', code: '000000', memberId: 'bo', role: 'parent', status: 'approved' });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
// Dữ liệu đúng dạng, giống app ghi.
const MED = { id: 'amlo', memberId: 'bo', name: 'Amlodipin 5mg', pillsPerDose: 1, times: ['07:00'], afterMeal: true, stockPills: 30 };
const DOSE = { memberId: 'bo', medId: 'amlo', date: '2026-10-01', time: '07:00', status: 'taken', at: '2026-10-01T00:05:00.000Z' };
const SOS = { id: 's', memberId: 'bo', at: '2026-10-01T00:05:00.000Z', cancelled: false, lat: 21.03, lng: 105.85 };

test('tạo gia đình: chỉ được có chính mình', async () => {
  await assertSucceeds(setDoc(doc(as('a'), 'families', 'f2'), { ownerUid: 'a', uids: ['a'] }));
  await assertFails(setDoc(doc(as('a'), 'families', 'f3'), { ownerUid: 'a', uids: ['a', 'b'] }));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'families', 'f4'), { ownerUid: 'x', uids: ['x'] }));
});

test('người trong gia đình đọc/ghi được, người ngoài thì không', async () => {
  await assertSucceeds(setDoc(doc(as('con'), 'families', FAM, 'medications', 'amlo'), MED));
  await assertSucceeds(getDoc(doc(as('bo'), 'families', FAM, 'medications', 'amlo')));
  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'doseLogs', 'x'), DOSE));
  await assertFails(getDoc(doc(as('la'), 'families', FAM, 'medications', 'amlo')));
  await assertFails(setDoc(doc(as('la'), 'families', FAM, 'sosEvents', 's'), SOS));
  await assertFails(getDoc(doc(as('la'), 'families', FAM)));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'khac', 'x'), { a: 1 }));
});

test('dữ liệu phải đúng dạng: trường lạ, số vô lý, chữ quá dài, giờ sai đều bị từ chối', async () => {
  const fam = (c: string, id: string) => doc(as('con'), 'families', FAM, c, id);
  const BP = { memberId: 'bo', at: '2026-10-01T01:00:00.000Z', sys: 135, dia: 85, pulse: 76 };
  await assertSucceeds(setDoc(fam('bpReadings', 'b1'), BP));
  await assertFails(setDoc(fam('bpReadings', 'b2'), { ...BP, sys: 999 }));
  await assertFails(setDoc(fam('bpReadings', 'b3'), { ...BP, sys: '135' }));
  await assertFails(setDoc(fam('bpReadings', 'b4'), { ...BP, hacker: true }));
  await assertFails(setDoc(fam('medications', 'amlo'), { ...MED, name: 'x'.repeat(101) }));
  await assertFails(setDoc(fam('medications', 'amlo'), { ...MED, name: '' }));
  await assertFails(setDoc(fam('medications', 'khac'), MED));
  await assertSucceeds(setDoc(fam('medications', 'anh'), { ...MED, id: 'anh', photoUri: 'data:image/jpeg;base64,' + 'A'.repeat(40000) }));
  await assertFails(setDoc(fam('medications', 'anh'), { ...MED, id: 'anh', photoUri: 'A'.repeat(60001) }));
  await assertFails(setDoc(fam('doseLogs', 'd2'), { ...DOSE, time: '7h sáng' }));
  await assertFails(setDoc(fam('doseLogs', 'd3'), { ...DOSE, status: 'maybe' }));
  await assertFails(setDoc(fam('checkins', 'c1'), { memberId: 'bo', at: 'x', mood: 'happy', symptoms: [] }));
  await assertSucceeds(setDoc(fam('checkins', 'c2'), { memberId: 'bo', at: 'x', mood: 'tired', symptoms: ['Đau đầu'] }));
  await assertFails(setDoc(fam('sosEvents', 's2'), { ...SOS, id: 's2', lat: 200 }));
  await assertFails(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Chú', self: 'Con' }));
  await assertSucceeds(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Bố', self: 'Con', phone: '0912345678' }));
  const HEALTH = { birthYear: 1954, conditions: ['Huyết áp cao'], allergies: 'Penicillin', bloodType: 'O+', insurance: 'HT2797924000123', hospital: 'BV Chợ Rẫy', address: '12 Lê Lợi' };
  await assertSucceeds(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Bố', self: 'Con', ...HEALTH }));
  await assertFails(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Bố', self: 'Con', birthYear: 1800 }));
  await assertFails(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Bố', self: 'Con', allergies: 'x'.repeat(301) }));
  await assertFails(setDoc(fam('members', 'm1'), { id: 'm1', name: 'Hùng', call: 'Bố', self: 'Con', diagnosis: 'x' }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 1 } }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 30, x: 1 } }));
  await assertFails(setDoc(doc(as('bo'), 'families', FAM, 'heartbeats', 'bo'), { at: 'x', uid: 'bo', battery: 150 }));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'devices', 'con'), { role: 'child', pushToken: 'x'.repeat(301) }));
  await assertSucceeds(deleteDoc(fam('bpReadings', 'b1')));
});

test('không tự thêm mình vào gia đình, chỉ sửa được cài đặt', async () => {
  await assertFails(updateDoc(doc(as('la'), 'families', FAM), { uids: ['con', 'bo', 'la'] }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: ['con', 'bo', 'la'] }));
  await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 20 } }));
  await assertFails(deleteDoc(doc(as('bo'), 'families', FAM)));
});

test('máy chỉ sửa thông tin của chính mình, nhịp còn sống ghi đúng uid', async () => {
  await assertSucceeds(setDoc(doc(as('con'), 'families', FAM, 'devices', 'con'), { role: 'child', pushToken: 't' }));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'devices', 'bo'), { role: 'child' }));
  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'heartbeats', 'bo'), { at: 'x', uid: 'bo' }));
  await assertFails(setDoc(doc(as('bo'), 'families', FAM, 'heartbeats', 'bo'), { at: 'x', uid: 'con' }));
  await assertFails(getDoc(doc(as('con'), 'families', FAM, 'sentAlerts', 'x')));
});

test('mã kết nối: người trong gia đình tạo, máy mới đọc được khi biết mã, không tạo đè', async () => {
  const code = { familyId: FAM, memberId: 'bo', expiresAt: future(), expiresAtMs: futureMs(), createdBy: 'con' };
  await assertSucceeds(setDoc(doc(as('con'), 'pairingCodes', '123456'), code));
  await assertFails(setDoc(doc(as('con'), 'pairingCodes', '123456'), code));
  await assertSucceeds(getDoc(doc(as('la'), 'pairingCodes', '123456')));
  await assertFails(setDoc(doc(as('la'), 'pairingCodes', '654321'), { ...code, createdBy: 'la' }));
  await assertFails(setDoc(doc(as('con'), 'pairingCodes', '12345'), code));
  await assertFails(setDoc(doc(as('con'), 'pairingCodes', '222222'), { ...code, expiresAtMs: 'mai' }));
});

describe('vào gia đình bằng yêu cầu + đồng ý (không cần Cloud Functions)', () => {
  const seedCode = async (c: string, extra: Record<string, unknown> = {}) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'pairingCodes', c), { familyId: FAM, memberId: 'me', expiresAt: future(), expiresAtMs: futureMs(), createdBy: 'con', ...extra });
    });
  const req = (uid: string, code: string, memberId = 'me', role = 'parent') => ({ uid, code, memberId, role, status: 'pending', device: 'iPhone' });

  test('máy mới gửi yêu cầu khi có mã đúng; mã sai / hết hạn / sai người thì không', async () => {
    await seedCode('111111');
    await seedCode('222222', { expiresAtMs: Date.now() - 1000 });
    await assertSucceeds(setDoc(doc(as('meThu'), 'families', FAM, 'joinRequests', 'meThu'), req('meThu', '111111')));
    await assertFails(setDoc(doc(as('x'), 'families', FAM, 'joinRequests', 'x'), req('x', '999999')));
    await assertFails(setDoc(doc(as('y'), 'families', FAM, 'joinRequests', 'y'), req('y', '222222')));
    await assertFails(setDoc(doc(as('z'), 'families', FAM, 'joinRequests', 'z'), req('z', '111111', 'bo')));
    await assertFails(setDoc(doc(as('z'), 'families', FAM, 'joinRequests', 'khac'), req('khac', '111111')));
    await assertFails(setDoc(doc(as('z'), 'families', FAM, 'joinRequests', 'z'), { ...req('z', '111111'), status: 'approved' }));
  });

  test('chỉ người trong gia đình đồng ý được; người xin không tự vào được', async () => {
    await seedCode('333333');
    await setDoc(doc(as('meThu'), 'families', FAM, 'joinRequests', 'meThu'), req('meThu', '333333'));
    await assertSucceeds(getDoc(doc(as('meThu'), 'families', FAM, 'joinRequests', 'meThu')));
    await assertFails(updateDoc(doc(as('meThu'), 'families', FAM), { uids: arrayUnion('meThu') }));
    await assertFails(updateDoc(doc(as('meThu'), 'families', FAM, 'joinRequests', 'meThu'), { status: 'approved' }));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayUnion('nguoiLa') }));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: ['con', 'bo', 'meThu', 'nguoiLa'] }));
    // Chưa bấm Đồng ý thì chưa thêm vào được.
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayUnion('meThu') }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM, 'joinRequests', 'meThu'), { status: 'approved', decidedBy: 'con' }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayUnion('meThu') }));
    await assertSucceeds(getDoc(doc(as('meThu'), 'families', FAM)));
    // Đã quyết rồi thì không đổi được nữa.
    await assertFails(updateDoc(doc(as('con'), 'families', FAM, 'joinRequests', 'meThu'), { status: 'denied' }));
  });

  test('mã cho máy mới của con: xin vào đúng vai trò; mã máy bố mẹ không dùng để vào làm máy con', async () => {
    await seedCode('444444', { memberId: '', role: 'child' });
    await seedCode('555555');
    await assertSucceeds(setDoc(doc(as('conMoi'), 'families', FAM, 'joinRequests', 'conMoi'), req('conMoi', '444444', '', 'child')));
    await assertFails(setDoc(doc(as('x2'), 'families', FAM, 'joinRequests', 'x2'), req('x2', '444444', '', 'parent')));
    await assertFails(setDoc(doc(as('x3'), 'families', FAM, 'joinRequests', 'x3'), req('x3', '555555', 'me', 'child')));
    await assertFails(setDoc(doc(as('x4'), 'families', FAM, 'joinRequests', 'x4'), req('x4', '444444', '', 'admin')));
    // Máy bố mẹ KHÔNG duyệt được (chống kẻ gian gọi điện nhờ bố mẹ bấm Đồng ý); máy con thì được.
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM, 'joinRequests', 'conMoi'), { status: 'approved' }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM, 'joinRequests', 'conMoi'), { status: 'approved' }));
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayUnion('conMoi') }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayUnion('conMoi') }));
  });

  test('tìm lại gia đình của mình (sau khi đăng nhập email) được, gia đình người khác thì không', async () => {
    await assertSucceeds(getDocs(query(collection(as('con'), 'families'), where('uids', 'array-contains', 'con'))));
    await assertFails(getDocs(query(collection(as('la'), 'families'), where('uids', 'array-contains', 'con'))));
  });

  test('gỡ máy: chỉ chủ gỡ được máy khác; máy khác chỉ tự rời; chủ không tự gỡ mình', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'families', FAM), { uids: ['con', 'bo', 'em'] });
      await setDoc(doc(ctx.firestore(), 'families', FAM, 'devices', 'em'), { role: 'child' });
    });
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayRemove('em') }));
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayRemove('con') }));
    await assertFails(deleteDoc(doc(as('bo'), 'families', FAM, 'devices', 'em')));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayRemove('con') }));
    await assertSucceeds(deleteDoc(doc(as('con'), 'families', FAM, 'devices', 'em')));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayRemove('em') }));
    await assertSucceeds(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayRemove('bo') }));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: [] }));
  });

  test('xóa cả gia đình: chỉ máy quản lý', async () => {
    await assertFails(deleteDoc(doc(as('bo'), 'families', FAM)));
    await assertSucceeds(deleteDoc(doc(as('con'), 'families', FAM)));
  });

  test('chuyển quyền chủ: chỉ chủ, chỉ cho máy đang trong gia đình', async () => {
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM), { ownerUid: 'bo' }));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { ownerUid: 'nguoiLa' }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { ownerUid: 'bo' }));
    await assertSucceeds(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayRemove('con') }));
  });
});

describe('chống máy bố mẹ bị nhiễm mã độc', () => {
  // Máy bố đã vào gia đình bằng mã của bố mẹ (yêu cầu đã được Đồng ý); máy em vào bằng mã máy con.
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await updateDoc(doc(db, 'families', FAM), { uids: ['con', 'bo', 'em'] });
      await setDoc(doc(db, 'families', FAM, 'joinRequests', 'bo'), { uid: 'bo', code: '111111', memberId: 'bo', role: 'parent', status: 'approved' });
      await setDoc(doc(db, 'families', FAM, 'joinRequests', 'em'), { uid: 'em', code: '222222', memberId: '', role: 'child', status: 'approved' });
      await setDoc(doc(db, 'families', FAM, 'medications', 'amlo'), MED);
      await setDoc(doc(db, 'families', FAM, 'doseLogs', 'd1'), DOSE);
    });
  });

  test('máy bố mẹ không xóa được thuốc, nhật ký; máy con và máy quản lý thì được', async () => {
    await assertFails(deleteDoc(doc(as('bo'), 'families', FAM, 'medications', 'amlo')));
    await assertFails(deleteDoc(doc(as('bo'), 'families', FAM, 'doseLogs', 'd1')));
    await assertSucceeds(deleteDoc(doc(as('em'), 'families', FAM, 'doseLogs', 'd1')));
    await assertSucceeds(deleteDoc(doc(as('con'), 'families', FAM, 'medications', 'amlo')));
    // Máy bố mẹ vẫn ghi được việc của mình.
    await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'doseLogs', 'd2'), { ...DOSE, time: '19:00' }));
  });

  test('máy bố mẹ không tự đổi thành "máy của con", không tự xóa yêu cầu đã được đồng ý', async () => {
    await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'devices', 'bo'), { role: 'parent', memberId: 'bo' }));
    await assertFails(setDoc(doc(as('bo'), 'families', FAM, 'devices', 'bo'), { role: 'child' }));
    await assertFails(deleteDoc(doc(as('bo'), 'families', FAM, 'joinRequests', 'bo')));
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM, 'joinRequests', 'bo'), { role: 'child' }));
    await assertSucceeds(setDoc(doc(as('em'), 'families', FAM, 'devices', 'em'), { role: 'child' }));
    await assertFails(setDoc(doc(as('em'), 'families', FAM, 'devices', 'em'), { role: 'parent' }));
  });

  test('máy đã bị gỡ khỏi gia đình xóa được yêu cầu cũ để xin vào lại; chủ xóa được', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'families', FAM), { uids: ['con', 'bo'] });
    });
    await assertSucceeds(deleteDoc(doc(as('em'), 'families', FAM, 'joinRequests', 'em')));
    await assertSucceeds(deleteDoc(doc(as('con'), 'families', FAM, 'joinRequests', 'bo')));
  });
});

test('lời nhắn, "con đã thấy" SOS, cỡ chữ của bố mẹ: ghi được đúng dạng, sai dạng bị từ chối', async () => {
  const MSG = { id: 'm1', memberId: 'bo', from: 'Hà', text: 'Bố nhớ uống thuốc nhé', at: '2026-11-10T12:00:00.000Z' };
  await assertSucceeds(setDoc(doc(as('con'), 'families', FAM, 'messages', 'm1'), MSG));
  await assertSucceeds(updateDoc(doc(as('bo'), 'families', FAM, 'messages', 'm1'), { seenAt: '2026-11-10T12:05:00.000Z' }));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'messages', 'm2'), { ...MSG, id: 'm2', text: '' }));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'messages', 'm3'), { ...MSG, id: 'm3', text: 'x'.repeat(201) }));
  await assertFails(setDoc(doc(as('la'), 'families', FAM, 'messages', 'm4'), { ...MSG, id: 'm4' }));
  await assertFails(getDoc(doc(as('la'), 'families', FAM, 'messages', 'm1')));

  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'sosEvents', 's'), SOS));
  await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM, 'sosEvents', 's'), { ackBy: 'Hà', ackAt: '2026-10-01T00:06:00.000Z' }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM, 'sosEvents', 's'), { ackBy: 'x'.repeat(61) }));

  const BO = { id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' };
  await assertSucceeds(setDoc(doc(as('con'), 'families', FAM, 'members', 'bo'), BO));
  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'members', 'bo'), { ...BO, textScale: 1.4 }));
  await assertFails(setDoc(doc(as('bo'), 'families', FAM, 'members', 'bo'), { ...BO, textScale: 9 }));
});

test('nhật ký uống thuốc: lý do không uống chỉ nhận "out" / "unable"', async () => {
  const ref = (id: string) => doc(as('bo'), 'families', FAM, 'doseLogs', id);
  await assertSucceeds(setDoc(ref('d1'), { ...DOSE, status: 'skipped', reason: 'out' }));
  await assertSucceeds(setDoc(ref('d2'), { ...DOSE, status: 'skipped', reason: 'unable' }));
  await assertFails(setDoc(ref('d3'), { ...DOSE, status: 'skipped', reason: 'khac' }));
});

test('thuốc theo đợt / cách ngày / theo thứ: đúng dạng thì nhận', async () => {
  const ref = doc(as('con'), 'families', FAM, 'medications', 'amlo');
  await assertSucceeds(setDoc(ref, { ...MED, start: '2026-11-10', until: '2026-11-16', every: 2, weekdays: [1, 3, 5] }));
  await assertFails(setDoc(ref, { ...MED, until: '16/11/2026' }));
  await assertFails(setDoc(ref, { ...MED, every: 0 }));
});

test('nhịp còn sống có cờ tắt thông báo; cài đặt có giờ nhắc đo huyết áp', async () => {
  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'heartbeats', 'bo'), { at: '2026-11-10T01:00:00.000Z', battery: 80, uid: 'bo', notifOff: true }));
  await assertFails(setDoc(doc(as('bo'), 'families', FAM, 'heartbeats', 'bo'), { at: '2026-11-10T01:00:00.000Z', uid: 'bo', notifOff: 'có' }));
  await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 30, bpRemind: '07:00' } }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 30, bpRemind: '7h' } }));
});

test('gói cước và mã giới thiệu: không tự đổi ngày dùng thử, không ghi lượt giới thiệu giả', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'families', 'f2'), { ownerUid: 'x', uids: ['x'] });
  });
  // Mã giới thiệu: chỉ tạo cho gia đình của mình.
  await assertSucceeds(setDoc(doc(as('con'), 'referralCodes', 'ABCDEF'), { familyId: FAM, createdBy: 'con' }));
  await assertFails(setDoc(doc(as('la'), 'referralCodes', 'GHJKLM'), { familyId: FAM, createdBy: 'la' }));
  await assertFails(setDoc(doc(as('con'), 'referralCodes', 'ABCDEF'), { familyId: FAM, createdBy: 'con' })); // không tạo đè
  await assertFails(setDoc(doc(as('con'), 'referralCodes', 'ABC0EF'), { familyId: FAM, createdBy: 'con' })); // ký tự dễ nhầm
  await assertSucceeds(getDoc(doc(as('x'), 'referralCodes', 'ABCDEF')));
  // Gói: mã phải là của gia đình mình; ngày dùng thử, mã không đổi được; mã đã nhập không đổi sang mã khác.
  const bill = doc(as('con'), 'families', FAM, 'meta', 'billing');
  await assertFails(setDoc(bill, { trialStart: '2026-11-01T00:00:00.000Z', refCode: 'ZZZZZZ' }));
  await assertSucceeds(setDoc(bill, { trialStart: '2026-11-01T00:00:00.000Z', refCode: 'ABCDEF' }));
  await assertFails(updateDoc(bill, { trialStart: '2030-01-01T00:00:00.000Z' }));
  await assertSucceeds(getDoc(doc(as('bo'), 'families', FAM, 'meta', 'billing')));
  await assertFails(getDoc(doc(as('x'), 'families', FAM, 'meta', 'billing')));
  // Gia đình f2 nhập mã ABCDEF rồi trả phí: ghi được một lượt; gia đình FAM đọc được, người khác không.
  await assertSucceeds(setDoc(doc(as('x'), 'referralCodes', 'XYZWVU'), { familyId: 'f2', createdBy: 'x' }));
  const bill2 = doc(as('x'), 'families', 'f2', 'meta', 'billing');
  await assertSucceeds(setDoc(bill2, { trialStart: '2026-11-01T00:00:00.000Z', refCode: 'XYZWVU' }));
  await assertFails(setDoc(doc(as('x'), 'referralCodes', 'ABCDEF', 'uses', 'XYZWVU'), { code: 'XYZWVU', paidAt: '2026-12-01T00:00:00.000Z' })); // chưa nhập mã
  await assertSucceeds(updateDoc(bill2, { referredBy: 'ABCDEF' }));
  await assertFails(updateDoc(bill2, { referredBy: 'GHJKLM' }));
  await assertSucceeds(setDoc(doc(as('x'), 'referralCodes', 'ABCDEF', 'uses', 'XYZWVU'), { code: 'XYZWVU', paidAt: '2026-12-01T00:00:00.000Z' }));
  await assertSucceeds(getDocs(collection(as('con'), 'referralCodes', 'ABCDEF', 'uses')));
  await assertFails(getDocs(collection(as('x'), 'referralCodes', 'ABCDEF', 'uses')));
});

test('đăng ký dùng thử từ web: ai cũng gửi được đúng dạng, không ai đọc được', async () => {
  const anon = env.unauthenticatedContext().firestore();
  const S = { name: 'Hà', phone: '0901234567', email: '', role: 'child', phoneType: 'android', plan: 'medium', ref: 'ABCDEF', at: '2026-11-12T01:00:00.000Z' };
  await assertSucceeds(setDoc(doc(anon, 'signups', 's1'), S));
  await assertFails(setDoc(doc(anon, 'signups', 's2'), { ...S, name: '' }));
  await assertFails(setDoc(doc(anon, 'signups', 's3'), { ...S, admin: true }));
  await assertFails(getDoc(doc(anon, 'signups', 's1')));
  await assertFails(getDoc(doc(as('con'), 'signups', 's1')));
});

describe('đợt bảo mật 13/11: máy bố mẹ bị lợi dụng, mã kết nối', () => {
  const fam = (uid: string, c: string, id: string) => doc(as(uid), 'families', FAM, c, id);
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'families', FAM, 'medications', 'amlo'), MED);
      await setDoc(doc(db, 'families', FAM, 'caregivers', 'ha'), { id: 'ha', name: 'Hà', phone: '0912345678', order: 1 });
      await setDoc(doc(db, 'families', FAM, 'joinRequests', 'la'), { uid: 'la', code: '777777', memberId: '', role: 'child', status: 'pending' });
    });
  });

  test('máy bố mẹ không tự nâng thành máy của con (tự từ chối rồi tự xóa yêu cầu)', async () => {
    await assertFails(updateDoc(fam('bo', 'joinRequests', 'bo'), { status: 'denied' }));
    await assertFails(deleteDoc(fam('bo', 'joinRequests', 'bo')));
    await assertFails(setDoc(fam('bo', 'devices', 'bo'), { role: 'child' }));
  });

  test('máy bố mẹ không tạo mã, không duyệt máy lạ', async () => {
    const code = { familyId: FAM, memberId: '', role: 'child', expiresAt: future(), expiresAtMs: futureMs(), createdBy: 'bo' };
    await assertFails(setDoc(doc(as('bo'), 'pairingCodes', '135790'), code));
    await assertFails(setDoc(doc(as('bo'), 'pairingCodes', '135791'), { ...code, role: 'parent', memberId: 'bo' }));
    await assertFails(updateDoc(fam('bo', 'joinRequests', 'la'), { status: 'approved' }));
  });

  test('mã kết nối không sống quá lâu: mã người nhà ≤ 1 giờ, mã bố mẹ ≤ 24 giờ', async () => {
    const base = { familyId: FAM, expiresAt: future(), createdBy: 'con' };
    await assertSucceeds(setDoc(doc(as('con'), 'pairingCodes', '246801'), { ...base, memberId: '', role: 'child', expiresAtMs: Date.now() + 3500_000 }));
    await assertFails(setDoc(doc(as('con'), 'pairingCodes', '246802'), { ...base, memberId: '', role: 'child', expiresAtMs: Date.now() + 2 * 3600_000 }));
    await assertSucceeds(setDoc(doc(as('con'), 'pairingCodes', '246803'), { ...base, memberId: 'bo', expiresAtMs: Date.now() + 23 * 3600_000 }));
    await assertFails(setDoc(doc(as('con'), 'pairingCodes', '246804'), { ...base, memberId: 'bo', expiresAtMs: Date.now() + 48 * 3600_000 }));
  });

  test('máy bố mẹ chỉ ghi việc của chính mình', async () => {
    // Không đổi số người nhận SOS, không sửa giờ uống thuốc, không sửa cài đặt.
    await assertFails(updateDoc(fam('bo', 'caregivers', 'ha'), { phone: '0999999999' }));
    await assertFails(setDoc(fam('bo', 'caregivers', 'ke'), { id: 'ke', name: 'Kẻ gian', phone: '0999999999', order: 0 }));
    await assertFails(updateDoc(fam('bo', 'medications', 'amlo'), { times: ['23:00'] }));
    await assertFails(setDoc(fam('bo', 'medications', 'moi'), { ...MED, id: 'moi' }));
    await assertFails(updateDoc(doc(as('bo'), 'families', FAM), { settings: { lateMinutes: 240 } }));
    // Ghi được: số viên còn lại, uống thuốc / huyết áp / SOS của chính mình.
    await assertSucceeds(updateDoc(fam('bo', 'medications', 'amlo'), { stockPills: 29 }));
    await assertSucceeds(setDoc(fam('bo', 'doseLogs', 'd9'), DOSE));
    await assertFails(setDoc(fam('bo', 'doseLogs', 'd8'), { ...DOSE, memberId: 'me' }));
    await assertSucceeds(setDoc(fam('bo', 'sosEvents', 's9'), { ...SOS, id: 's9' }));
    await assertSucceeds(updateDoc(fam('bo', 'sosEvents', 's9'), { cancelled: true }));
    await assertFails(setDoc(fam('bo', 'sosEvents', 's8'), { ...SOS, id: 's8', memberId: 'me' }));
    // Nhịp còn sống: chỉ cho đúng bố/mẹ của máy đó; máy con không giả được.
    await assertFails(setDoc(fam('bo', 'heartbeats', 'me'), { at: 'x', uid: 'bo' }));
    await assertFails(setDoc(fam('con', 'heartbeats', 'bo'), { at: 'x', uid: 'con' }));
  });

  test('ảnh thuốc phải là ảnh nhúng, không phải đường link ra ngoài', async () => {
    await assertFails(setDoc(fam('con', 'medications', 'amlo'), { ...MED, photoUri: 'https://ke-gian.example/theo-doi.jpg' }));
    await assertSucceeds(setDoc(fam('con', 'medications', 'amlo'), { ...MED, photoUri: 'data:image/jpeg;base64,/9j/4AAQ' }));
    await assertFails(setDoc(fam('con', 'medications', 'amlo'), { ...MED, weekdays: [1, 9] }));
  });

  test('tạo gia đình không kèm trường lạ', async () => {
    await assertFails(setDoc(doc(as('a'), 'families', 'f9'), { ownerUid: 'a', uids: ['a'], plan: 'large' }));
  });
});
