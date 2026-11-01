import { logSlot, slotsForDay } from '../../domain/schedule';
import { diffData, docId, emptyShared, mergeRemote, shared, type SharedData } from '../../domain/syncdiff';
import { emptyData, type AppData } from '../../domain/types';
import { MemoryServer, MemorySync } from '../memorySync';
import { SyncError } from '../sync';
import { SyncEngine } from '../syncEngine';

const NOW = new Date(2026, 9, 1, 9, 0);

function withMed(d: AppData): AppData {
  return {
    ...d,
    members: [{ id: 'bo', name: 'Hùng', call: 'Bố', self: 'Con' }],
    medications: [{ id: 'amlo', memberId: 'bo', name: 'Amlodipin', pillsPerDose: 1, times: ['07:00'], stockPills: 10 }],
  };
}

/** Một "máy": dữ liệu trên máy + SyncEngine, giống cách store.tsx dùng. */
class Device {
  data: AppData;
  engine?: SyncEngine;
  acked?: SharedData;
  errors: string[] = [];
  constructor(public sync: MemorySync, data: AppData = emptyData()) {
    this.data = data;
  }
  connect(familyId: string, base: SharedData) {
    this.engine = new SyncEngine({
      sync: this.sync,
      familyId,
      base,
      onRemote: (snap) => {
        this.data = mergeRemote(this.data, snap);
      },
      saveAcked: (b) => {
        this.acked = b;
      },
      onError: (e) => this.errors.push(e.message),
    });
    this.engine.start(shared(this.data));
  }
  async change(fn: (d: AppData) => AppData) {
    this.data = fn(this.data);
    await this.engine?.push(shared(this.data));
  }
}

describe('diffData', () => {
  it('chỉ ghi tài liệu thay đổi, xóa tài liệu bị bỏ', () => {
    const a = shared(withMed(emptyData()));
    expect(diffData(a, a)).toEqual([]);
    const b = { ...a, medications: [{ ...a.medications[0], stockPills: 9 }] };
    expect(diffData(a, b)).toEqual([{ op: 'set', coll: 'medications', id: 'amlo', data: b.medications[0] }]);
    const c = { ...a, medications: [] };
    expect(diffData(a, c)).toEqual([{ op: 'delete', coll: 'medications', id: 'amlo' }]);
  });

  it('không gửi lastSeenAt/battery của người, không gửi trường undefined', () => {
    const a = shared(withMed(emptyData()));
    const b = { ...a, members: [{ ...a.members[0], lastSeenAt: NOW.toISOString(), battery: 50, phone: undefined }] };
    expect(diffData(a, b)).toEqual([]);
  });

  it('mã tài liệu cố định theo nội dung sự kiện', () => {
    expect(docId('doseLogs', { memberId: 'bo', medId: 'amlo', date: '2026-10-01', time: '07:00', status: 'taken', at: 'x' })).toBe(
      'bo_2026-10-01_07:00_amlo',
    );
  });
});

describe('mergeRemote', () => {
  it('giữ sự kiện chưa gửi được, lấy cài đặt từ máy chủ, gắn tín hiệu còn sống', () => {
    const local = withMed(emptyData());
    local.checkins = [{ memberId: 'bo', at: '2026-10-01T01:00:00.000Z', mood: 'good', symptoms: [] }];
    const merged = mergeRemote(local, {
      medications: [],
      checkins: [{ memberId: 'bo', at: '2026-10-01T00:00:00.000Z', mood: 'tired', symptoms: [] }],
      heartbeats: { bo: { at: '2026-10-01T02:00:00.000Z', battery: 40 } },
    });
    expect(merged.medications).toEqual([]);
    expect(merged.checkins.map((c) => c.mood)).toEqual(['tired', 'good']);
    expect(merged.members[0]).toMatchObject({ lastSeenAt: '2026-10-01T02:00:00.000Z', battery: 40 });
  });

  it('phần chưa tải xong thì giữ nguyên trên máy', () => {
    const local = withMed(emptyData());
    expect(mergeRemote(local, {}).medications).toHaveLength(1);
  });
});

describe('hai máy qua máy chủ', () => {
  async function setup() {
    const server = new MemoryServer();
    server.now = () => NOW;
    const child = new Device(new MemorySync(server, 'uid-con'), withMed({ ...emptyData(), role: 'child' }));
    const fid = await child.sync.createFamily();
    child.connect(fid, emptyShared({} as AppData['settings']));
    await child.engine!.flush();
    const pairing = await child.sync.createPairingCode(fid, 'bo');
    const parent = new Device(new MemorySync(server, 'uid-bo'));
    const res = await parent.sync.redeemPairingCode(pairing.code);
    parent.data = { ...parent.data, role: 'parent', currentMemberId: res.memberId };
    parent.connect(res.familyId, shared(emptyData()));
    return { server, fid, child, parent, code: pairing.code };
  }

  it('máy bố mẹ nhận thuốc con đã nhập, con thấy bố uống thuốc', async () => {
    const { child, parent } = await setup();
    expect(parent.data.members.map((m) => m.name)).toEqual(['Hùng']);
    expect(parent.data.settings).toEqual(child.data.settings);

    const slot = slotsForDay(parent.data.medications, [], 'bo', NOW, NOW, 30)[0];
    await parent.change((d) => ({ ...d, doseLogs: logSlot(slot, 'taken', NOW) }));
    expect(child.data.doseLogs).toHaveLength(1);
    expect(child.data.doseLogs[0].status).toBe('taken');
  });

  it('nhịp còn sống từ máy bố mẹ hiện trên máy con', async () => {
    const { child, parent, fid } = await setup();
    await parent.sync.heartbeat(fid, 'bo', 80);
    expect(child.data.members[0]).toMatchObject({ lastSeenAt: NOW.toISOString(), battery: 80 });
  });

  it('con sửa thuốc thì máy bố mẹ cập nhật, không bị máy bố mẹ ghi đè lại', async () => {
    const { child, parent, server, fid } = await setup();
    await child.change((d) => ({ ...d, medications: d.medications.map((m) => ({ ...m, times: ['07:00', '19:00'] })) }));
    expect(parent.data.medications[0].times).toEqual(['07:00', '19:00']);
    await parent.change((d) => d);
    expect([...server.families.get(fid)!.colls.medications.values()][0].times).toEqual(['07:00', '19:00']);
  });

  it('mã đã dùng hoặc sai thì từ chối; người ngoài gia đình không ghi được', async () => {
    const { server, code, fid } = await setup();
    const other = new MemorySync(server, 'uid-la');
    await expect(other.redeemPairingCode(code)).rejects.toEqual(new SyncError('wrong'));
    await expect(other.redeemPairingCode('12')).rejects.toEqual(new SyncError('format'));
    await expect(other.apply(fid, [{ op: 'delete', coll: 'medications', id: 'amlo' }])).rejects.toThrow('permission-denied');
  });

  it('mã hết hạn', async () => {
    const server = new MemoryServer();
    server.now = () => NOW;
    const s = new MemorySync(server, 'a');
    const fid = await s.createFamily();
    const p = await s.createPairingCode(fid, 'bo');
    server.now = () => new Date(NOW.getTime() + 25 * 3600_000);
    await expect(new MemorySync(server, 'b').redeemPairingCode(p.code)).rejects.toEqual(new SyncError('expired'));
  });

  it('ghi lỗi thì gửi lại ở lần sau', async () => {
    const { parent } = await setup();
    const real = parent.sync.apply.bind(parent.sync);
    let fail = true;
    parent.sync.apply = async (f, w) => {
      if (fail) throw new Error('mất mạng');
      return real(f, w);
    };
    await parent.change((d) => ({ ...d, checkins: [{ memberId: 'bo', at: NOW.toISOString(), mood: 'good', symptoms: [] }] }));
    expect(parent.errors).toEqual(['mất mạng']);
    fail = false;
    const applied = jest.fn(real);
    parent.sync.apply = applied;
    await parent.change((d) => d);
    expect(applied).toHaveBeenCalledTimes(1);
    expect(parent.acked?.checkins).toHaveLength(1);
  });
});
