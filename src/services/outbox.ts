// Gửi thông báo đẩy cho máy khác trong gia đình; không gửi được (mất mạng) thì giữ lại, gửi lại sau:
// mỗi phút khi đang mở app, khi mở lại app, và mỗi lần chạy nền.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lateCopy, pruneOutbox, type OutboxItem } from '../domain/outbox';
import type { PushMessage } from '../domain/pushRules';
import { OUTBOX_KEY } from '../state/keys';
import { sendPushDetailed } from './push';
import type { FamilySync } from './sync';

/** true: đã gửi (hoặc không có máy nào để gửi, không cần thử lại). false: mất mạng, cần thử lại. */
async function tryOnce(sync: FamilySync, item: OutboxItem, now: Date): Promise<boolean> {
  let tokens: string[];
  try {
    tokens = item.to === 'children' ? await sync.childPushTokens(item.familyId) : await sync.parentPushTokens(item.familyId, item.to.memberId);
  } catch {
    return false;
  }
  if (!tokens.length) return true;
  return (await sendPushDetailed(tokens, lateCopy(item, now))).reached;
}

async function load(): Promise<OutboxItem[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(OUTBOX_KEY)) ?? '[]') as OutboxItem[];
  } catch {
    return [];
  }
}

let flushing: Promise<void> | undefined;

/** Gửi ngay; không được thì cất vào hộp thư chờ. */
export async function deliver(sync: FamilySync, familyId: string, to: OutboxItem['to'], msg: PushMessage): Promise<void> {
  const now = new Date();
  const item: OutboxItem = { id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`, familyId, to, msg, at: now.toISOString(), tries: 1 };
  if (await tryOnce(sync, item, now)) return;
  await flushing;
  const list = pruneOutbox([...(await load()), item], now);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
}

/** Gửi lại các tin đang chờ. */
export function flushOutbox(sync: FamilySync, now = new Date()): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const list = pruneOutbox(await load(), now);
    if (!list.length) {
      await AsyncStorage.removeItem(OUTBOX_KEY);
      return;
    }
    const left: OutboxItem[] = [];
    for (const item of list) {
      if (!(await tryOnce(sync, item, now))) left.push({ ...item, tries: item.tries + 1 });
    }
    // Có tin mới vào trong lúc đang gửi: giữ lại.
    const added = (await load()).filter((x) => !list.some((y) => y.id === x.id));
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...left, ...added]));
  })().finally(() => {
    flushing = undefined;
  });
  return flushing;
}

export async function outboxSize(): Promise<number> {
  return (await load()).length;
}
