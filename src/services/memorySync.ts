// Máy chủ giả trong bộ nhớ, cùng giao diện FamilySync. Dùng cho kiểm thử
// (mô phỏng hai máy: con và bố mẹ, dùng chung một "máy chủ").
import { createPairing, checkCode } from '../domain/pairing';
import { COLLECTIONS, type CollectionName, type RemoteSnapshot, type SyncWrite } from '../domain/syncdiff';
import type { AlertSettings, Pairing, Role } from '../domain/types';
import { SyncError, type DeviceInfo, type FamilySync, type JoinRequest } from './sync';

interface FamilyDoc {
  uids: string[];
  settings?: AlertSettings;
  colls: Record<CollectionName, Map<string, Record<string, unknown>>>;
  heartbeats: Map<string, { at: string; battery?: number }>;
  devices: Map<string, DeviceInfo>;
  requests: Map<string, JoinRequest>;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type Listener = (snap: RemoteSnapshot, pending: boolean) => void;

export class MemoryServer {
  families = new Map<string, FamilyDoc>();
  codes = new Map<string, Pairing & { familyId: string; role: Role }>();
  accounts = new Map<string, { uid: string; password: string }>();
  listeners = new Map<string, Set<Listener>>();
  reqListeners = new Map<string, Set<() => void>>();

  notifyRequests(familyId: string) {
    for (const l of this.reqListeners.get(familyId) ?? []) l();
  }
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
    this.server.families.set(id, { uids: [this.uid], colls, heartbeats: new Map(), devices: new Map(), requests: new Map() });
    return id;
  }

  async createPairingCode(familyId: string, memberId: string, role: Role = 'parent') {
    this.server.family(familyId, this.uid);
    const p = createPairing(memberId, this.server.now());
    this.server.codes.set(p.code, { ...p, familyId, role });
    return p;
  }

  async requestJoin(code: string) {
    const c = code.replace(/\s/g, '');
    const p = this.server.codes.get(c);
    const res = checkCode(c, p, this.server.now());
    if (!res.ok) throw new SyncError(res.reason);
    const f = this.server.families.get(p!.familyId)!;
    f.requests.set(this.uid, { uid: this.uid, code: c, memberId: res.memberId, role: p!.role, status: 'pending', device: 'Máy thử' });
    this.server.notifyRequests(p!.familyId);
    return { familyId: p!.familyId, memberId: res.memberId, role: p!.role };
  }

  async linkedEmail() {
    return [...this.server.accounts.entries()].find(([, a]) => a.uid === this.uid)?.[0];
  }

  async linkEmail(email: string, password: string) {
    if (this.server.accounts.has(email)) throw Object.assign(new Error('email-already-in-use'), { code: 'auth/email-already-in-use' });
    this.server.accounts.set(email, { uid: this.uid, password });
  }

  async restoreWithEmail(email: string, password: string) {
    const a = this.server.accounts.get(email);
    if (!a || a.password !== password) throw Object.assign(new Error('invalid-credential'), { code: 'auth/invalid-credential' });
    this.uid = a.uid;
    for (const [id, f] of this.server.families) {
      if (f.uids.includes(a.uid)) {
        const dev = f.devices.get(a.uid);
        return { familyId: id, role: dev?.role ?? ('child' as Role), memberId: dev?.memberId };
      }
    }
    return undefined;
  }

  watchJoinRequest(familyId: string, onStatus: (s: JoinRequest['status'] | 'gone') => void) {
    const f = this.server.families.get(familyId);
    const fn = () => onStatus(f?.requests.get(this.uid)?.status ?? 'gone');
    const set = this.server.reqListeners.get(familyId) ?? new Set();
    set.add(fn);
    this.server.reqListeners.set(familyId, set);
    fn();
    return () => void set.delete(fn);
  }

  subscribeJoinRequests(familyId: string, onList: (list: JoinRequest[]) => void) {
    const f = this.server.family(familyId, this.uid);
    const fn = () => onList([...f.requests.values()].filter((r) => r.status === 'pending'));
    const set = this.server.reqListeners.get(familyId) ?? new Set();
    set.add(fn);
    this.server.reqListeners.set(familyId, set);
    fn();
    return () => void set.delete(fn);
  }

  async decideJoin(familyId: string, req: JoinRequest, approve: boolean) {
    const f = this.server.family(familyId, this.uid);
    const r = f.requests.get(req.uid);
    if (!r) throw new Error('not-found');
    if (approve && !f.uids.includes(req.uid)) f.uids.push(req.uid);
    r.status = approve ? 'approved' : 'denied';
    if (approve) this.server.codes.delete(req.code);
    this.server.notifyRequests(familyId);
  }

  async childPushTokens(familyId: string) {
    const f = this.server.family(familyId, this.uid);
    return [...f.devices.values()].filter((d) => d.role === 'child' && d.pushToken).map((d) => d.pushToken!);
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
