// Máy chủ giả trong bộ nhớ, cùng giao diện FamilySync. Dùng cho kiểm thử
// (mô phỏng hai máy: con và bố mẹ, dùng chung một "máy chủ").
import { createPairing, checkCode } from '../domain/pairing';
import { COLLECTIONS, type CollectionName, type RemoteSnapshot, type SyncWrite } from '../domain/syncdiff';
import type { AlertSettings, Pairing } from '../domain/types';
import { SyncError, type DeviceInfo, type FamilySync } from './sync';

interface FamilyDoc {
  uids: string[];
  settings?: AlertSettings;
  colls: Record<CollectionName, Map<string, Record<string, unknown>>>;
  heartbeats: Map<string, { at: string; battery?: number }>;
  devices: Map<string, DeviceInfo>;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type Listener = (snap: RemoteSnapshot, pending: boolean) => void;

export class MemoryServer {
  families = new Map<string, FamilyDoc>();
  codes = new Map<string, Pairing & { familyId: string; used?: boolean }>();
  listeners = new Map<string, Set<Listener>>();
  private n = 0;
  now = () => new Date();

  nextId(prefix: string) {
    return `${prefix}${++this.n}`;
  }

  family(id: string, uid: string): FamilyDoc {
    const f = this.families.get(id);
    if (!f || !f.uids.includes(uid)) throw new Error('permission-denied');
    return f;
  }

  snapshot(f: FamilyDoc): RemoteSnapshot {
    const snap: Record<string, unknown> = {};
    for (const c of COLLECTIONS) snap[c] = [...f.colls[c].values()].map((d) => clone(d));
    if (f.settings) snap.settings = clone(f.settings);
    snap.heartbeats = Object.fromEntries(f.heartbeats);
    return snap as RemoteSnapshot;
  }

  notify(familyId: string) {
    const f = this.families.get(familyId);
    if (!f) return;
    for (const l of this.listeners.get(familyId) ?? []) l(this.snapshot(f), false);
  }
}

export class MemorySync implements FamilySync {
  constructor(
    private server: MemoryServer,
    private uid: string,
  ) {}

  async signIn() {
    return this.uid;
  }

  async createFamily() {
    const id = this.server.nextId('fam');
    const colls = Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()])) as FamilyDoc['colls'];
    this.server.families.set(id, { uids: [this.uid], colls, heartbeats: new Map(), devices: new Map() });
    return id;
  }

  async createPairingCode(familyId: string, memberId: string) {
    this.server.family(familyId, this.uid);
    const p = createPairing(memberId, this.server.now());
    this.server.codes.set(p.code, { ...p, familyId });
    return p;
  }

  async redeemPairingCode(code: string) {
    const c = code.replace(/\s/g, '');
    const p = this.server.codes.get(c);
    const res = checkCode(c, p && !p.used ? p : undefined, this.server.now());
    if (!res.ok) throw new SyncError(res.reason);
    p!.used = true;
    const f = this.server.families.get(p!.familyId)!;
    if (!f.uids.includes(this.uid)) f.uids.push(this.uid);
    return { familyId: p!.familyId, memberId: res.memberId };
  }

  async apply(familyId: string, writes: SyncWrite[]) {
    const f = this.server.family(familyId, this.uid);
    for (const w of writes) {
      if (w.op === 'settings') f.settings = clone(w.data);
      else if (w.op === 'set') f.colls[w.coll].set(w.id, clone(w.data));
      else f.colls[w.coll].delete(w.id);
    }
    this.server.notify(familyId);
  }

  async heartbeat(familyId: string, memberId: string, battery?: number) {
    const f = this.server.family(familyId, this.uid);
    f.heartbeats.set(memberId, { at: this.server.now().toISOString(), battery });
    this.server.notify(familyId);
  }

  async registerDevice(familyId: string, info: DeviceInfo) {
    this.server.family(familyId, this.uid).devices.set(this.uid, info);
  }

  subscribe(familyId: string, onData: Listener) {
    const f = this.server.family(familyId, this.uid);
    const set = this.server.listeners.get(familyId) ?? new Set();
    set.add(onData);
    this.server.listeners.set(familyId, set);
    onData(this.server.snapshot(f), false);
    return () => set.delete(onData);
  }
}
