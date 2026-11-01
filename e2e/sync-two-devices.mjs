// Chạy thử 2 máy (con + bố) và 1 máy lạ qua Firebase Emulator (npm run e2e:sync), luồng miễn phí:
// bố mẹ nhập mã → con bấm Đồng ý → đồng bộ hai chiều; máy lạ dùng lại mã / bị con từ chối thì không vào được.
//
// Cần chạy trước (cửa sổ khác): npx firebase-tools emulators:start --only auth,firestore --project demo-homebeat
// Cần Playwright + Chromium: npm i -D playwright && npx playwright install chromium
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = path.resolve('.e2e/sync');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

if (!process.argv.includes('--no-build')) {
  console.log('Đang build bản web nối với emulator...');
  fs.rmSync(path.join(OUT, 'web'), { recursive: true, force: true });
  execSync(`npx expo export -p web --output-dir ${path.join(OUT, 'web')}`, {
    stdio: 'ignore',
    env: {
      ...process.env,
      EXPO_OFFLINE: '1',
      EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-homebeat.firebaseapp.com',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-homebeat',
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:1:web:1',
      EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1',
    },
  });
}
// Máy chủ web: trả index.html cho mọi đường dẫn của app.
const root = path.join(OUT, 'web');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;
const fsGet = async (p) => (await fetch(`http://127.0.0.1:8080/v1/projects/demo-homebeat/databases/(default)/documents/${p}`, { headers: { Authorization: 'Bearer owner' } })).json();

  const b = await chromium.launch();
  const mk = async () => (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const con = await mk(), bo = await mk(), la = await mk();
  const errs = [];
  for (const [n, p] of [['con', con], ['bo', bo], ['la', la]]) { p.on('pageerror', (e) => errs.push(`${n}: ${e.message}`)); p.on('console', (m) => m.text().includes('[An Tâm]') && console.log(`   [${n}] ${m.text().slice(0, 160)}`)); }
  let pass = 0, fail = 0;
  const step = async (name, fn) => {
    try { await fn(); pass++; console.log('OK  ', name); }
    catch (e) { fail++; console.log('LỖI ', name, '→', e.message.split('\n')[0]); await con.screenshot({ path: `${SHOTS}/s2-con.png` }); await bo.screenshot({ path: `${SHOTS}/s2-bo.png` }); await la.screenshot({ path: `${SHOTS}/s2-la.png` }); }
  };
  const vis = (p, t) => p.getByText(t, { exact: typeof t === 'string' }).filter({ visible: true }).first();
  const enterCode = async (p, code) => { for (const d of code) await p.getByLabel(`Số ${d}`, { exact: true }).filter({ visible: true }).first().click(); await p.getByText('Kết nối với con').filter({ visible: true }).first().click(); };
  let code;
  // Xóa dữ liệu của lần chạy trước trên máy chủ thử.
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-homebeat/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-homebeat/accounts', { method: 'DELETE' });

  await step('Máy con: tạo gia đình và mã kết nối', async () => {
    await con.goto(URL); await con.getByText('Tôi là con, cháu').click();
    await con.getByLabel('Tên của bố mẹ').fill('Hùng'); await con.getByLabel('Tên của bạn').fill('Hà');
    await con.getByText('Tạo mã kết nối', { exact: true }).click();
    const el = con.getByText(/^\d{3} \d{3}$/); await el.waitFor({ timeout: 20000 }); code = (await el.textContent()).replace(' ', '');
    await con.getByText('Xong, vào trang chủ').click(); await vis(con, 'Bố mẹ hôm nay').waitFor();
  });
  await step('Máy bố: nhập mã → màn hình chờ con đồng ý (chưa vào gia đình)', async () => {
    await bo.goto(URL); await bo.getByText('Tôi là bố, mẹ').click(); await enterCode(bo, code);
    await vis(bo, 'Đã gửi yêu cầu kết nối').waitFor({ timeout: 15000 });
    const fam = (await fsGet('families')).documents[0];
    if (fam.fields.uids.arrayValue.values.length !== 1) throw new Error('máy bố đã vào gia đình khi con chưa đồng ý');
  });
  await step('Máy con: thấy "Có máy xin kết nối" → Đồng ý', async () => {
    await vis(con, /Có máy xin kết nối làm máy của bố Hùng/i).waitFor({ timeout: 15000 });
    await vis(con, 'Đồng ý').click();
  });
  await step('Máy bố: tự vào gia đình sau khi con đồng ý', async () => {
    await vis(bo, 'Đã kết nối với gia đình').waitFor({ timeout: 15000 });
    const fam = (await fsGet('families')).documents[0];
    if (fam.fields.uids.arrayValue.values.length !== 2) throw new Error('chưa có 2 máy trong gia đình');
    const codes = await fsGet('pairingCodes');
    if ((codes.documents || []).length) throw new Error('mã đã dùng chưa bị xóa');
  });
  await step('Máy bố: vào trang chủ (hướng dẫn) → bấm "ổn"', async () => {
    await bo.goto(URL); await vis(bo, 'Hướng dẫn · 1/3').waitFor({ timeout: 15000 });
    await vis(bo, 'Bỏ qua hướng dẫn').click(); await vis(bo, 'Con ơi, bố ổn').click();
    await vis(bo, /Đã báo cho các con lúc/).waitFor();
  });
  await step('Máy con: thấy bố đã điểm danh "Khỏe"', async () => {
    await vis(con, /· Khỏe$/).waitFor({ timeout: 15000 });
  });
  await step('Máy lạ dùng lại mã cũ → báo mã chưa đúng', async () => {
    await la.goto(URL); await la.getByText('Tôi là bố, mẹ').click(); await enterCode(la, code);
    await vis(la, /Mã chưa đúng/).waitFor({ timeout: 15000 });
  });
  await step('Con tạo mã mới; máy lạ xin vào; con Từ chối → máy lạ biết, không vào được', async () => {
    await con.getByText('Gia đình', { exact: true }).last().click();
    await vis(con, 'Tạo mã kết nối cho máy của bố').click();
    const el = con.getByText(/^Mã kết nối: \d{3} \d{3}$/).filter({ visible: true }); await el.waitFor({ timeout: 15000 });
    const code2 = (await el.textContent()).replace(/\D/g, '');
    console.log('   mã mới:', code2);
    await la.goto(URL); console.log('   máy lạ: mở lại app');
    await la.getByText('Tôi là bố, mẹ').filter({ visible: true }).first().click(); console.log('   máy lạ: chọn bố mẹ');
    await enterCode(la, code2); console.log('   máy lạ: nhập mã');
    await vis(la, 'Đã gửi yêu cầu kết nối').waitFor({ timeout: 15000 }); console.log('   máy lạ: đang chờ');
    await con.getByText('Từ chối', { exact: true }).last().click(); console.log('   con: bấm Từ chối');
    await vis(la, 'Chưa kết nối được').waitFor({ timeout: 15000 });
    const fam = (await fsGet('families')).documents[0];
    if (fam.fields.uids.arrayValue.values.length !== 2) throw new Error('máy lạ đã vào gia đình');
  });
  await con.screenshot({ path: `${SHOTS}/s2-con-cuoi.png` });
  console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi. Lỗi trang: ${errs.length ? errs.join(' | ') : 'không'}`);
  await b.close();
  server.close();
  process.exit(fail || errs.length ? 1 : 0);
