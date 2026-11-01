// Kiểm thử luật bảo mật Firestore (firestore.rules) trên Firestore Emulator.
// Chạy: npm run test:rules (trong thư mục functions; cần Java và firebase-tools).
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
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

test('tạo gia đình: chỉ được có chính mình', async () => {
  await assertSucceeds(setDoc(doc(as('a'), 'families', 'f2'), { ownerUid: 'a', uids: ['a'] }));
  await assertFails(setDoc(doc(as('a'), 'families', 'f3'), { ownerUid: 'a', uids: ['a', 'b'] }));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'families', 'f4'), { ownerUid: 'x', uids: ['x'] }));
});

test('người trong gia đình đọc/ghi được, người ngoài thì không', async () => {
  await assertSucceeds(setDoc(doc(as('con'), 'families', FAM, 'medications', 'amlo'), { id: 'amlo', name: 'Amlodipin' }));
  await assertSucceeds(getDoc(doc(as('bo'), 'families', FAM, 'medications', 'amlo')));
  await assertSucceeds(setDoc(doc(as('bo'), 'families', FAM, 'doseLogs', 'x'), { at: 'x' }));
  await assertFails(getDoc(doc(as('la'), 'families', FAM, 'medications', 'amlo')));
  await assertFails(setDoc(doc(as('la'), 'families', FAM, 'sosEvents', 's'), { at: 'x' }));
  await assertFails(getDoc(doc(as('la'), 'families', FAM)));
  await assertFails(setDoc(doc(as('con'), 'families', FAM, 'khac', 'x'), { a: 1 }));
});

test('không tự thêm mình vào gia đình, chỉ sửa được cài đặt', async () => {
  await assertFails(updateDoc(doc(as('la'), 'families', FAM), { uids: ['con', 'bo', 'la'] }));
  await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: ['con', 'bo', 'la'] }));
  await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { settings: { lateMinutes: 20 } }));
  await assertFails(deleteDoc(doc(as('con'), 'families', FAM)));
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
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayUnion('meThu') }));
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM, 'joinRequests', 'meThu'), { status: 'approved', decidedBy: 'con' }));
    await assertSucceeds(getDoc(doc(as('meThu'), 'families', FAM)));
  });

  test('mã cho máy mới của con: xin vào đúng vai trò; mã máy bố mẹ không dùng để vào làm máy con', async () => {
    await seedCode('444444', { memberId: '', role: 'child' });
    await seedCode('555555');
    await assertSucceeds(setDoc(doc(as('conMoi'), 'families', FAM, 'joinRequests', 'conMoi'), req('conMoi', '444444', '', 'child')));
    await assertFails(setDoc(doc(as('x2'), 'families', FAM, 'joinRequests', 'x2'), req('x2', '444444', '', 'parent')));
    await assertFails(setDoc(doc(as('x3'), 'families', FAM, 'joinRequests', 'x3'), req('x3', '555555', 'me', 'child')));
    await assertFails(setDoc(doc(as('x4'), 'families', FAM, 'joinRequests', 'x4'), req('x4', '444444', '', 'admin')));
    // Máy bố mẹ (đã trong gia đình) đồng ý máy mới của con được.
    await assertSucceeds(updateDoc(doc(as('bo'), 'families', FAM), { uids: arrayUnion('conMoi') }));
  });

  test('tìm lại gia đình của mình (sau khi đăng nhập email) được, gia đình người khác thì không', async () => {
    await assertSucceeds(getDocs(query(collection(as('con'), 'families'), where('uids', 'array-contains', 'con'))));
    await assertFails(getDocs(query(collection(as('la'), 'families'), where('uids', 'array-contains', 'con'))));
  });

  test('bỏ bớt máy được, nhưng không được để gia đình trống', async () => {
    await assertSucceeds(updateDoc(doc(as('con'), 'families', FAM), { uids: arrayRemove('bo') }));
    await assertFails(updateDoc(doc(as('con'), 'families', FAM), { uids: [] }));
  });
});
