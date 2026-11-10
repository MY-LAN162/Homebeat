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
  execSync(`npx expo export -p web --clear --output-dir ${path.join(OUT, 'web')}`, {
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
  // Lần đầu mở app trên mỗi máy: đồng ý chính sách quyền riêng tư.
  const firstOpen = async (p) => {
    await p.goto(URL);
    await vis(p, 'Trước khi bắt đầu').waitFor({ timeout: 15000 });
    await p.getByLabel('Tôi đồng ý').filter({ visible: true }).first().click();
    await vis(p, 'Đồng ý và tiếp tục').click();
  };
  // Xóa dữ liệu của lần chạy trước trên máy chủ thử.
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-homebeat/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-homebeat/accounts', { method: 'DELETE' });

  await step('Máy con: tạo gia đình và mã kết nối', async () => {
    await firstOpen(con); await con.getByText('Tôi là con, cháu').click();
    await con.getByLabel('Tên của bố mẹ').fill('Hùng'); await con.getByLabel('Tên của bạn').fill('Hà');
    // Chưa có số điện thoại thì chưa tạo được mã (SOS phải gọi được cho ai đó).
    if (await con.getByRole('button', { name: 'Tạo mã kết nối', exact: true }).isEnabled()) throw new Error('tạo được mã khi chưa có số điện thoại');
    await con.getByLabel('Số điện thoại của bạn').fill('0901234567');
    await con.getByText('Tạo mã kết nối', { exact: true }).click();
    const el = con.getByText(/^\d{3} \d{3}$/); await el.waitFor({ timeout: 20000 }); code = (await el.textContent()).replace(' ', '');
    await con.getByText(/hỏi “Cho phép An Tâm gửi thông báo\?”/).waitFor();
    await con.getByText('Xong, vào trang chủ').click(); await vis(con, 'Bố mẹ hôm nay').waitFor();
  });
  await step('Máy bố: nhập mã → màn hình chờ con đồng ý (chưa vào gia đình)', async () => {
    await firstOpen(bo); await bo.getByText('Tôi là bố, mẹ').click(); await enterCode(bo, code);
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
  await step('Con thêm thuốc → máy bố thấy lịch thuốc (dữ liệu đúng dạng được máy chủ nhận)', async () => {
    await con.goto(URL + 'child/med-edit');
    await con.getByRole('textbox', { name: 'Tên thuốc và hàm lượng', exact: true }).fill('Amlodipin 5mg');
    await con.getByRole('textbox', { name: 'Số viên còn lại (để báo sắp hết)', exact: true }).fill('30');
    await vis(con, '21:00').click();
    await vis(con, 'Lưu và tạo lịch nhắc').click();
    await vis(con, /Thuốc của bố mẹ|Bố mẹ hôm nay/).waitFor({ timeout: 15000 });
    const t0 = Date.now();
    await bo.getByText(/(07|21):00 · 1 viên/).first().waitFor({ state: 'attached', timeout: 30000 });
    console.log(`   máy bố nhận thuốc sau ${((Date.now() - t0) / 1000).toFixed(1)} giây`);
  });
  await step('Bố nhập huyết áp → máy con thấy', async () => {
    await bo.goto(URL + 'parent/bp');
    await vis(bo, 'Lưu và gửi cho các con').click();
    await vis(bo, 'Con ơi, bố ổn').waitFor({ timeout: 15000 }).catch(() => undefined);
    await con.goto(URL + 'child');
    await vis(con, /^\d{2,3}\/\d{2,3}$/).waitFor({ timeout: 15000 });
  });
  await step('Máy lạ dùng lại mã cũ → báo mã chưa đúng', async () => {
    await firstOpen(la); await la.getByText('Tôi là bố, mẹ').click(); await enterCode(la, code);
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
  const moi = await mk(), moi2 = await mk();
  for (const [n, p] of [['máy mới', moi], ['máy mới 2', moi2]]) p.on('pageerror', (e) => errs.push(`${n}: ${e.message}`));
  await step('Con đổi điện thoại: máy bố tạo mã cho máy mới của con', async () => {
    await vis(bo, /đổi điện thoại\? Bấm vào đây/i).click();
    await vis(bo, 'Tạo mã cho máy mới của con').click();
    const el = bo.getByText(/^\d{3} \d{3}$/).filter({ visible: true }).first(); await el.waitFor({ timeout: 15000 });
    code = (await el.textContent()).replace(' ', '');
  });
  await step('Máy mới: "Lấy lại gia đình" → nhập mã → chờ đồng ý', async () => {
    await firstOpen(moi); await vis(moi, 'Đổi điện thoại? Lấy lại gia đình đã có').click();
    await vis(moi, 'Nhập mã').click(); await enterCode(moi, code);
    await vis(moi, 'Đã gửi yêu cầu kết nối').waitFor({ timeout: 15000 });
  });
  await step('Máy bố thấy "Có người nhà xin cùng theo dõi" → Đồng ý → máy mới vào màn hình con', async () => {
    await vis(bo, 'Có người nhà xin cùng theo dõi (máy của con, cháu)').waitFor({ timeout: 15000 });
    await bo.getByText('Đồng ý', { exact: true }).filter({ visible: true }).last().click();
    await vis(moi, 'Bố mẹ hôm nay').waitFor({ timeout: 15000 });
    await vis(moi, /Bố Hùng ›/).waitFor({ timeout: 15000 });
  });
  await step('Máy con liên kết email trong Cài đặt', async () => {
    await con.goto(URL + 'child/settings');
    await vis(con, 'Bảo vệ khi đổi điện thoại').waitFor({ timeout: 15000 });
    await con.getByRole('textbox', { name: 'Email', exact: true }).fill('ha@example.com');
    await con.getByRole('textbox', { name: 'Mật khẩu (ít nhất 8 ký tự)', exact: true }).fill('matkhau123');
    await con.getByRole('textbox', { name: 'Nhập lại mật khẩu', exact: true }).fill('matkhau123');
    await vis(con, 'Liên kết email').click();
    await vis(con, /Đã liên kết email ha@example.com/).waitFor({ timeout: 15000 });
  });
  await step('Máy mới 2: đăng nhập email sai mật khẩu bị từ chối; đúng thì vào lại gia đình', async () => {
    await firstOpen(moi2); await vis(moi2, 'Đổi điện thoại? Lấy lại gia đình đã có').click();
    await moi2.getByRole('textbox', { name: 'Email', exact: true }).fill('ha@example.com');
    await moi2.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('saimatkhau');
    await vis(moi2, 'Đăng nhập').click(); await vis(moi2, 'Email hoặc mật khẩu chưa đúng.').waitFor({ timeout: 15000 });
    await moi2.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('matkhau123');
    await vis(moi2, 'Đăng nhập').click();
    await vis(moi2, 'Bố mẹ hôm nay').waitFor({ timeout: 15000 });
    await vis(moi2, /Bố Hùng ›/).waitFor({ timeout: 15000 });
  });
  await step('Các máy trong gia đình: máy con (quản lý) thấy đủ máy, gỡ được máy mới', async () => {
    await con.goto(URL + 'child/devices');
    await vis(con, 'Máy của bố Hùng').waitFor({ timeout: 15000 });
    await vis(con, /quản lý gia đình/).waitFor();
    const before = (await fsGet('families')).documents[0].fields.uids.arrayValue.values.length;
    await con.getByText('Gỡ máy này', { exact: true }).filter({ visible: true }).last().click();
    await con.getByRole('button', { name: 'Gỡ', exact: true }).click();
    for (let i = 0; i < 30; i++) {
      const after = (await fsGet('families')).documents[0].fields.uids.arrayValue.values.length;
      if (after === before - 1) return;
      await con.waitForTimeout(300);
    }
    throw new Error('máy chưa bị gỡ trên máy chủ');
  });
  await step('Máy quản lý xóa toàn bộ dữ liệu gia đình (hỏi lại 2 lần) → máy chủ không còn gì', async () => {
    await con.goto(URL + 'child/settings');
    await vis(con, 'Xóa toàn bộ dữ liệu gia đình trên máy chủ').click();
    await con.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await con.getByRole('button', { name: 'Xóa hẳn', exact: true }).click();
    await vis(con, /Ai đang dùng điện thoại này\?/).waitFor({ timeout: 20000 });
    const fams = await fsGet('families');
    if ((fams.documents || []).length) throw new Error('máy chủ vẫn còn dữ liệu gia đình');
  });
  await con.screenshot({ path: `${SHOTS}/s2-con-cuoi.png` });
  console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi. Lỗi trang: ${errs.length ? errs.join(' | ') : 'không'}`);
  await b.close();
  server.close();
  process.exit(fail || errs.length ? 1 : 0);
