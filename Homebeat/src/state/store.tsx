// Kho dữ liệu của app. Hiện lưu trên máy (AsyncStorage).
// Khi có máy chủ đồng bộ, thay `storage` bằng một FamilySync (xem src/services/sync.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { checkCode, createPairing, type PairResult } from '../domain/pairing';
import { consumeStock, logSlot, type DoseSlot } from '../domain/schedule';
import { demoData } from '../domain/seed';
import type {
  AlertSettings,
  AppData,
  Appointment,
  Caregiver,
  Member,
  Medication,
  Mood,
  Role,
} from '../domain/types';
import { emptyData } from '../domain/types';
import { rescheduleMedReminders } from '../services/notifications';

const KEY = 'homebeat:data:v1';

let counter = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

interface Store {
  ready: boolean;
  data: AppData;
  now: Date;
  setRole: (role: Role | undefined) => void;
  /** Con tạo gia đình: thêm bố/mẹ đầu tiên và tạo mã kết nối. */
  addMember: (m: Omit<Member, 'id'>) => Member;
  updateMember: (id: string, patch: Partial<Member>) => void;
  newPairing: (memberId: string) => void;
  /** Bố mẹ nhập mã. Bản chạy một máy: kiểm tra với mã đã tạo trên chính máy này. */
  pair: (code: string) => PairResult;
  setCurrentMember: (id: string) => void;
  upsertCaregiver: (c: Omit<Caregiver, 'id'> & { id?: string }) => void;
  removeCaregiver: (id: string) => void;
  upsertMedication: (m: Omit<Medication, 'id'> & { id?: string }) => void;
  removeMedication: (id: string) => void;
  markSlot: (slot: DoseSlot, status: 'taken' | 'skipped') => void;
  checkin: (memberId: string, mood: Mood, symptoms: string[]) => void;
  addBp: (memberId: string, sys: number, dia: number, pulse: number) => void;
  startSos: (memberId: string, loc?: { lat: number; lng: number }) => string;
  cancelSos: (id: string) => void;
  upsertAppointment: (a: Omit<Appointment, 'id'> & { id?: string }) => void;
  updateSettings: (patch: Partial<AlertSettings>) => void;
  loadDemo: () => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setData({ ...emptyData(), ...(JSON.parse(raw) as AppData) });
      })
      .catch(() => undefined)
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data]);

  // Đặt lại nhắc thuốc khi lịch thuốc hoặc người dùng máy thay đổi.
  const medKey = JSON.stringify([data.role, data.currentMemberId, data.medications.map((m) => [m.memberId, m.name, m.times])]);
  useEffect(() => {
    if (!loaded.current) return;
    rescheduleMedReminders(data).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medKey, ready]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const store = useMemo<Store>(() => {
    const iso = () => new Date().toISOString();
    return {
      ready,
      data,
      now,
      setRole: (role) => update((d) => ({ ...d, role })),
      addMember: (m) => {
        const member: Member = { ...m, id: newId('m') };
        update((d) => ({ ...d, members: [...d.members, member] }));
        return member;
      },
      updateMember: (id, patch) =>
        update((d) => ({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      newPairing: (memberId) => update((d) => ({ ...d, pairing: createPairing(memberId, new Date()) })),
      pair: (code) => {
        const res = checkCode(code, data.pairing, new Date());
        if (res.ok) update((d) => ({ ...d, role: 'parent', currentMemberId: res.memberId }));
        return res;
      },
      setCurrentMember: (id) => update((d) => ({ ...d, currentMemberId: id })),
      upsertCaregiver: (c) =>
        update((d) => {
          const id = c.id ?? newId('c');
          const exists = d.caregivers.some((x) => x.id === id);
          const next = { ...c, id } as Caregiver;
          return { ...d, caregivers: exists ? d.caregivers.map((x) => (x.id === id ? next : x)) : [...d.caregivers, next] };
        }),
      removeCaregiver: (id) => update((d) => ({ ...d, caregivers: d.caregivers.filter((c) => c.id !== id) })),
      upsertMedication: (m) =>
        update((d) => {
          const id = m.id ?? newId('t');
          const exists = d.medications.some((x) => x.id === id);
          const next = { ...m, id } as Medication;
          return { ...d, medications: exists ? d.medications.map((x) => (x.id === id ? next : x)) : [...d.medications, next] };
        }),
      removeMedication: (id) => update((d) => ({ ...d, medications: d.medications.filter((m) => m.id !== id) })),
      markSlot: (slot, status) =>
        update((d) => ({
          ...d,
          doseLogs: [
            ...d.doseLogs.filter((l) => !(l.memberId === slot.memberId && l.date === slot.date && l.time === slot.time)),
            ...logSlot(slot, status, new Date()),
          ],
          medications: status === 'taken' ? consumeStock(d.medications, slot) : d.medications,
        })),
      checkin: (memberId, mood, symptoms) =>
        update((d) => ({ ...d, checkins: [...d.checkins, { memberId, mood, symptoms, at: iso() }] })),
      addBp: (memberId, sys, dia, pulse) =>
        update((d) => ({ ...d, bpReadings: [...d.bpReadings, { memberId, sys, dia, pulse, at: iso() }] })),
      startSos: (memberId, loc) => {
        const id = newId('sos');
        update((d) => ({ ...d, sosEvents: [...d.sosEvents, { id, memberId, at: iso(), cancelled: false, ...loc }] }));
        return id;
      },
      cancelSos: (id) =>
        update((d) => ({ ...d, sosEvents: d.sosEvents.map((e) => (e.id === id ? { ...e, cancelled: true } : e)) })),
      upsertAppointment: (a) =>
        update((d) => {
          const id = a.id ?? newId('k');
          const exists = d.appointments.some((x) => x.id === id);
          const next = { ...a, id } as Appointment;
          return { ...d, appointments: exists ? d.appointments.map((x) => (x.id === id ? next : x)) : [...d.appointments, next] };
        }),
      updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      loadDemo: () => setData(demoData(new Date())),
      reset: () => setData(emptyData()),
    };
  }, [data, now, ready, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore phải nằm trong StoreProvider');
  return s;
}

/** Bố/mẹ đang dùng máy này (phía bố mẹ). */
export function useCurrentMember(): Member | undefined {
  const { data } = useStore();
  return data.members.find((m) => m.id === data.currentMemberId) ?? data.members[0];
}
