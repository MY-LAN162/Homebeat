// Kiểm thử luật bảo mật Firestore (firestore.rules) trên Firestore Emulator.
// Chạy: npm run test:rules (trong thư mục functions; cần Java và firebase-tools).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';

let env: RulesTestEnvironment;
const FAM = 'fam1';
const future = () => new Date(Date.now() + 3600_000).toISOString();

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

test('mã kết nối: người trong gia đình tạo, không ai đọc, không tạo đè', async () => {
  const code = { familyId: FAM, memberId: 'bo', expiresAt: future(), createdBy: 'con' };
  await assertSucceeds(setDoc(doc(as('con'), 'pairingCodes', '123456'), code));
  await assertFails(setDoc(doc(as('con'), 'pairingCodes', '123456'), code));
  await assertFails(getDoc(doc(as('con'), 'pairingCodes', '123456')));
  await assertFails(getDoc(doc(as('la'), 'pairingCodes', '123456')));
  await assertFails(setDoc(doc(as('la'), 'pairingCodes', '654321'), { ...code, createdBy: 'la' }));
  await assertFails(setDoc(doc(as('con'), 'pairingCodes', '12345'), code));
});
