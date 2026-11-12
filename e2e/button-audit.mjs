// Kiểm tra TỪNG NÚT trên TỪNG MÀN HÌNH (npm run audit:buttons).
// Mỗi nút được bấm trong một trình duyệt mới (cùng dữ liệu mẫu), rồi ghi lại nút đó làm gì:
// mở màn hình nào, hiện hộp thoại gì, gọi điện / chia sẻ / mở bản đồ, hay đổi nội dung trên màn hình.
// Kết quả: .e2e/audit/result.json và ảnh từng màn hình trong .e2e/audit/.
// Tùy chọn: --no-build (dùng bản build sẵn).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = path.resolve('.e2e');
const WEB = path.join(OUT, 'web-demo');
const AUD = path.join(OUT, 'audit');
const DATA_KEY = 'homebeat:data:v1';
const args = new Set(process.argv.slice(2));

if (!args.has('--no-build') || !fs.existsSync(WEB)) {
  console.log('Đang build bản web...');
  fs.rmSync(WEB, { recursive: true, force: true });
  execSync(`npx expo export -p web --clear --output-dir ${WEB}`, { stdio: 'ignore', env: { ...process.env, EXPO_OFFLINE: '1' } });
}
fs.rmSync(AUD, { recursive: true, force: true });
fs.mkdirSync(AUD, { recursive: true });

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.json': 'application/json', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(WEB, u);
  if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(WEB, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const NOW = new Date('2026-11-01T13:30:00+07:00');

// Theo dõi việc ra ngoài app: gọi điện, nhắn tin, mở bản đồ, chia sẻ.
const INIT = `
  window.__ext = [];
  const rec = (k, v) => window.__ext.push(k + ': ' + String(v).slice(0, 140));
  window.open = (u) => { rec('mở', u); return null; };
  Object.defineProperty(navigator, 'share', { value: (d) => { rec('chia sẻ', (d && (d.text || d.message || d.url)) || ''); return Promise.resolve(); }, configurable: true });
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && /^(tel|sms|mailto|https?):/.test(a.href) && a.origin !== location.origin) { rec('mở', a.href); e.preventDefault(); } }, true);
`;

async function newPage(storage) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  await ctx.addInitScript(INIT);
  if (storage) await ctx.addInitScript((s) => { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, storage);
  const p = await ctx.newPage();
  await p.clock.install({ time: NOW });
  p.__errs = []; p.__dialogs = [];
  p.on('pageerror', (e) => p.__errs.push(e.message));
  p.on('dialog', async (d) => { p.__dialogs.push(d.message().slice(0, 160)); await d.dismiss().catch(() => undefined); });
  p.on('request', (r) => { const u = r.url(); if (/^(tel|sms):/.test(u)) p.__dialogs.push('mở ' + u); });
  return { ctx, p };
}

// ---- Chuẩn bị dữ liệu mẫu: máy con, máy bố mẹ, máy mới (chưa chọn vai trò)
async function seed() {
  const { ctx, p } = await newPage();
  await p.goto(BASE + '/');
  await p.getByText('Tôi đã đọc và đồng ý', { exact: false }).first().click().catch(() => undefined);
  await p.waitForTimeout(400);
  await p.getByRole('checkbox').first().click().catch(() => undefined);
  await p.getByText('Đồng ý và tiếp tục', { exact: false }).first().click().catch(() => undefined);
  await p.getByText('Dùng thử với dữ liệu mẫu').first().click({ timeout: 15000 });
  await p.waitForTimeout(1500);
  const child = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await ctx.close();
  const d = JSON.parse(child[DATA_KEY]);
  const parent = { ...child, [DATA_KEY]: JSON.stringify({ ...d, role: 'parent', currentMemberId: 'bo', guideSeen: true }) };
  const fresh = { ...child, [DATA_KEY]: JSON.stringify({ version: 1, members: [], caregivers: [], medications: [], doseLogs: [], checkins: [], bpReadings: [], sosEvents: [], messages: [], appointments: [], settings: d.settings, consentAt: d.consentAt, consentVersion: d.consentVersion }) };
  return { child, parent, fresh, data: d };
}
const S = await seed();
const ap = S.data.appointments[0]?.id ?? 'ap1';
const med = S.data.medications[0]?.id ?? 'amlo';

const SCREENS = [
  ['Bắt đầu', 'fresh', '/onboarding'], ['Con: thêm bố mẹ', 'fresh', '/onboarding/invite'], ['Bố mẹ: nhập mã', 'fresh', '/onboarding/pair'],
  ['Lấy lại gia đình', 'fresh', '/onboarding/restore'],
  ['Con: Trang chủ', 'child', '/child'], ['Con: Thuốc', 'child', '/child/meds'], ['Con: Sửa thuốc', 'child', `/child/med-edit?id=${med}`],
  ['Con: Thêm thuốc', 'child', '/child/med-edit?memberId=bo'], ['Con: Quét đơn', 'child', '/child/scan?memberId=bo'],
  ['Con: Đi khám', 'child', '/child/visits'], ['Con: Chuẩn bị đi khám', 'child', `/child/visit-prep?id=${ap}`], ['Con: Ghi buổi khám', 'child', `/child/visit-record?id=${ap}`],
  ['Con: Gia đình', 'child', '/child/family'], ['Con: Chi tiết bố', 'child', '/child/member/bo'], ['Con: Cảnh báo trễ thuốc', 'child', '/child/alert?memberId=bo&kind=late-dose'],
  ['Con: Báo cáo 30 ngày', 'child', '/child/report?memberId=bo'], ['Con: Nhắn bố mẹ', 'child', '/child/message?memberId=bo'], ['Con: Gói và giới thiệu', 'child', '/child/plan'],
  ['Con: Cài đặt', 'child', '/child/settings'], ['Con: Mức sử dụng', 'child', '/child/usage'], ['Chính sách quyền riêng tư', 'child', '/privacy'],
  ['Bố: Trang chủ', 'parent', '/parent'], ['Bố: Uống thuốc', 'parent', '/parent/medicine'], ['Bố: Hôm nay thế nào', 'parent', '/parent/checkin'],
  ['Bố: Huyết áp', 'parent', '/parent/bp'], ['Bố: Cỡ chữ', 'parent', '/parent/text-size'], ['Bố: Hướng dẫn', 'parent', '/parent/guide'], ['Bố: SOS', 'parent', '/parent/sos'],
];

const LIST = () => [...document.querySelectorAll('[role="button"],[role="checkbox"],[role="link"],button,a[href]')]
  .filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 4 && r.height > 4 && st.visibility !== 'hidden' && !e.closest('[aria-hidden="true"]'); })
  .map((e) => ({ label: (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), disabled: e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('disabled'), role: e.getAttribute('role') || e.tagName.toLowerCase() }));
const TEXT = () => document.body.innerText;
// Trạng thái nhìn thấy của nút: đã chọn / màu nền / màu viền (nút chọn thường chỉ đổi màu, không đổi chữ).
const LOOK = (el) => { const st = getComputedStyle(el); const inner = el.firstElementChild ? getComputedStyle(el.firstElementChild) : st;
  return [el.getAttribute('aria-checked'), el.getAttribute('aria-selected'), el.getAttribute('aria-pressed'), st.backgroundColor, st.borderColor, inner.backgroundColor, inner.color].join('|'); };

const result = [];
for (const [name, state, route] of SCREENS) {
  const { ctx, p } = await newPage(S[state]);
  await p.goto(BASE + route);
  await p.waitForTimeout(1500);
  const shot = `${String(result.length + 1).padStart(2, '0')}.jpg`;
  await p.screenshot({ path: path.join(AUD, shot), type: 'jpeg', quality: 60, fullPage: true });
  const buttons = await p.evaluate(LIST);
  const screenErrs = [...p.__errs];
  await ctx.close();
  const rows = [];
  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    if (btn.disabled) { rows.push({ ...btn, outcome: 'đang khóa (chưa đủ điều kiện để bấm)', kind: 'disabled' }); continue; }
    const t = await newPage(S[state]);
    let outcome = '', kind = 'none';
    try {
      await t.p.goto(BASE + route);
      await t.p.waitForTimeout(1200);
      const before = { url: t.p.url(), text: await t.p.evaluate(TEXT) };
      const handles = await t.p.evaluateHandle(() => [...document.querySelectorAll('[role="button"],[role="checkbox"],[role="link"],button,a[href]')]
        .filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 4 && r.height > 4 && st.visibility !== 'hidden' && !e.closest('[aria-hidden="true"]'); }));
      const el = await handles.evaluateHandle((arr, k) => arr[k], i);
      await el.asElement().scrollIntoViewIfNeeded().catch(() => undefined);
      const lookBefore = await el.evaluate(new Function('el', 'return (' + LOOK.toString() + ')(el)'));
      await el.asElement().click({ timeout: 4000 });
      await t.p.waitForTimeout(900);
      await t.p.clock.runFor(1500).catch(() => undefined);
      const after = { url: t.p.url(), text: await t.p.evaluate(TEXT) };
      const ext = await t.p.evaluate(() => window.__ext);
      const lookAfter = await el.evaluate(new Function('el', 'return el.isConnected ? (' + LOOK.toString() + ')(el) : ""')).catch(() => '');
      const path0 = new URL(before.url).pathname, path1 = new URL(after.url).pathname + new URL(after.url).search;
      const added = after.text.split('\n').filter((x) => !before.text.includes(x)).slice(0, 2).join(' | ');
      if (t.p.__errs.length) { outcome = 'LỖI: ' + t.p.__errs[0].slice(0, 120); kind = 'error'; }
      else if (t.p.__dialogs.length) { outcome = 'hộp thoại: ' + t.p.__dialogs[0]; kind = 'dialog'; }
      else if (ext.length) { outcome = ext[0]; kind = 'external'; }
      else if (new URL(after.url).pathname !== path0) { outcome = 'mở ' + path1; kind = 'nav'; }
      else if (after.text !== before.text) { outcome = 'đổi trên màn hình' + (added ? ': ' + added.slice(0, 110) : ''); kind = 'change'; }
      else if (lookAfter && lookAfter !== lookBefore) { outcome = 'được chọn (đổi màu)'; kind = 'select'; }
      else { outcome = 'không thấy thay đổi'; kind = 'none'; }
    } catch (e) {
      outcome = 'không bấm được: ' + String(e.message).split('\n')[0].slice(0, 100); kind = 'error';
    }
    await t.ctx.close();
    rows.push({ ...btn, outcome, kind });
  }
  result.push({ name, route, state, shot, errors: screenErrs, buttons: rows });
  const bad = rows.filter((r) => r.kind === 'none' || r.kind === 'error').length;
  console.log(`${name.padEnd(28)} ${rows.length} nút${bad ? `, ${bad} cần xem` : ''}${screenErrs.length ? ' · LỖI TRANG' : ''}`);
}
fs.writeFileSync(path.join(AUD, 'result.json'), JSON.stringify(result, null, 1));
const total = result.reduce((s, r) => s + r.buttons.length, 0);
const none = result.reduce((s, r) => s + r.buttons.filter((b) => b.kind === 'none').length, 0);
const err = result.reduce((s, r) => s + r.buttons.filter((b) => b.kind === 'error').length, 0);
console.log(`\nTổng: ${result.length} màn hình, ${total} nút. Không thấy thay đổi: ${none}. Lỗi: ${err}.`);
await browser.close();
server.close();
