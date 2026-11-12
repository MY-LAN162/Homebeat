// Chạy thử app như người dùng thật (npm run e2e).
// 1. Build bản web  2. Đóng gói thành trang dùng thử (giống Artifact)  3. Dựng máy chủ chỉ phục vụ 1 đường dẫn
// (giống Artifact, đường dẫn khác trả "not found")  4. Bấm qua các màn hình, sau mỗi bước kiểm tra màn hình
// ĐANG HIỆN trước mắt đúng như mong đợi (không chỉ "chữ có trong trang").
//
// Cần Playwright + Chromium: npm i -D playwright && npx playwright install chromium
// Tùy chọn: --no-build (dùng bản build sẵn trong .e2e/), --headed (xem trình duyệt chạy).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { makeTestPage } from '../scripts/make-test-page.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = path.resolve('.e2e');
const SHOTS = path.join(OUT, 'shots');
const PAGE_PATH = '/x/artifact/page';
const args = new Set(process.argv.slice(2));

if (!args.has('--no-build')) {
  console.log('Đang build bản web...');
  fs.rmSync(path.join(OUT, 'web-demo'), { recursive: true, force: true });
  execSync(`npx expo export -p web --clear --output-dir ${path.join(OUT, 'web-demo')}`, { stdio: 'ignore', env: { ...process.env, EXPO_OFFLINE: '1' } });
}
const html = makeTestPage(OUT);
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${html}</body></html>`;
const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === PAGE_PATH) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}${PAGE_PATH}`;
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch({ headless: !args.has('--headed') });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
const p = await ctx.newPage();
// Giờ cố định 13:30 giờ Việt Nam để có cảnh báo trễ thuốc trong dữ liệu mẫu.
await p.clock.install({ time: new Date('2026-11-01T13:30:00+07:00') });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
  let pass = 0, fail = 0, n = 0;

  // Chữ có đang hiện thật không: nằm trong khung và không bị phần khác che.
  const onScreen = (text) =>
    p.evaluate((q) => {
      const re = q.re ? new RegExp(q.re) : null;
      const els = [...document.querySelectorAll('div,span,a,button,h1,h2')].filter((e) => e.childElementCount === 0 && e.textContent && (re ? re.test(e.textContent) : e.textContent.includes(q.s)));
      return els.some((e) => {
        let r = e.getBoundingClientRect();
        if (r.width && (r.bottom < 0 || r.top > innerHeight)) { e.scrollIntoView({ block: 'center' }); r = e.getBoundingClientRect(); }
        if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
        const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 10)));
        const hit = document.elementFromPoint(cx, cy);
        return !!hit && (hit === e || e.contains(hit) || hit.contains(e));
      });
    }, text instanceof RegExp ? { re: text.source } : { s: text });
  const expectScreen = async (text, timeout = 8000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await onScreen(text)) return; await p.waitForTimeout(150); }
    throw new Error(`không thấy "${text}" trên màn hình`);
  };
  // Tìm phần tử đang thật sự hiện (theo chữ hoặc theo nhãn), trả về tọa độ để bấm như người thật.
  const findPoint = (q) =>
    p.evaluate((q) => {
      const re = q.re ? new RegExp(q.re) : null;
      const match = (e) => {
        if (q.label) return e.getAttribute('aria-label') === q.label;
        if (e.childElementCount !== 0 || !e.textContent) return false;
        const t = e.textContent.trim();
        return re ? re.test(t) : q.exact ? t === q.s : t.includes(q.s);
      };
      const els = [...document.querySelectorAll(q.label ? '[aria-label]' : 'div,span,a,button')].filter(match);
      for (const e of els.reverse()) {
        let r = e.getBoundingClientRect();
        if (r.width && (r.bottom < 0 || r.top > innerHeight - 4)) { e.scrollIntoView({ block: 'center' }); r = e.getBoundingClientRect(); }
        if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight - 4 || r.right < 0 || r.left > innerWidth) continue;
        const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 12);
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === e || e.contains(hit) || hit.contains(e))) return { x, y };
      }
      return null;
    }, q);
  const clickWhenVisible = async (q, what) => {
    const end = Date.now() + 8000;
    while (Date.now() < end) {
      const pt = await findPoint(q);
      if (pt) { await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250); return; }
      await p.mouse.wheel(0, 250); await p.waitForTimeout(200);
    }
    throw new Error(`không bấm được "${what}"`);
  };
  const tap = (text, opts = {}) => clickWhenVisible(text instanceof RegExp ? { re: text.source } : { s: text, exact: !!opts.exact }, String(text));
  const back = () => clickWhenVisible({ label: 'Quay lại' }, 'Quay lại');
  const step = async (name, fn) => {
    n++;
    try { await fn(); pass++; console.log('OK  ', name); }
    catch (e) { fail++; console.log('LỖI ', name, '→', e.message.split('\n')[0]); await p.screenshot({ path: `${SHOTS}/J${String(n).padStart(2, '0')}-LOI.png` }); }
  };
  const tab = async (t) => {
    const pt = await p.evaluate((t) => {
      const e = [...document.querySelectorAll('div,span')].filter((x) => x.childElementCount === 0 && x.textContent.trim() === t).find((x) => x.getBoundingClientRect().top > innerHeight - 80);
      if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, t);
    if (!pt) throw new Error('không thấy tab ' + t);
    await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250);
  };

  await step('mở trang dùng thử → xin đồng ý quyền riêng tư', async () => { await p.goto(URL); await expectScreen('Trước khi bắt đầu', 15000); });
  await step('xem chính sách đầy đủ → Quay lại', async () => { await tap('Xem đầy đủ chính sách quyền riêng tư'); await expectScreen('1. Chúng tôi thu thập gì'); await back(); await expectScreen('Trước khi bắt đầu'); });
  await step('chưa tick thì chưa tiếp tục được; tick rồi Đồng ý', async () => {
    await tap('Đồng ý và tiếp tục'); await expectScreen('Trước khi bắt đầu');
    await clickWhenVisible({ label: 'Tôi đồng ý' }, 'ô đồng ý'); await tap('Đồng ý và tiếp tục'); await expectScreen('Ai đang dùng điện thoại này?');
  });
  await step('Người nhà mời cùng theo dõi › nhập mã người nhà › Quay lại', async () => {
    await tap('Người nhà mời tôi cùng theo dõi'); await expectScreen('Nhập mã người nhà gửi'); await back(); await expectScreen('Ai đang dùng điện thoại này?');
  });
  await step('vào dữ liệu mẫu', async () => { await tap('Dùng thử với dữ liệu mẫu'); await expectScreen('Bố mẹ hôm nay'); });
  // Trang chủ
  await step('Trang chủ › cảnh báo › Quay lại', async () => { await tap('Xem chi tiết ›'); await expectScreen(/Hôm nay của/); await back(); await expectScreen('Bố mẹ hôm nay'); });
  await step('Trang chủ › Bố Hùng › Quay lại', async () => { await tap(/Bố Hùng ›/); await expectScreen('Xem tình hình 30 ngày (đưa bác sĩ xem)'); await back(); await expectScreen('Bố mẹ hôm nay'); });
  await step('Bố Hùng › Bảng 30 ngày › Quay lại về Bố Hùng', async () => { await tap(/Bố Hùng ›/); await tap('Xem tình hình 30 ngày (đưa bác sĩ xem)'); await expectScreen(/Tình hình 30 ngày/); await back(); await expectScreen('Xem tình hình 30 ngày (đưa bác sĩ xem)'); await back(); await expectScreen('Bố mẹ hôm nay'); });
  await step('Trang chủ › Nhắn bố › chọn câu có sẵn › Gửi › thấy trong "đã nhắn" › Quay lại', async () => {
    await tap('💬 Nhắn bố'); await expectScreen('Chọn nhanh');
    await tap('Bố nhớ uống thuốc nhé', { exact: true }); await tap('Gửi cho bố', { exact: true });
    await expectScreen(/Đã lưu \(bản thử/); await expectScreen('Bố chưa xem', 3000).catch(() => expectScreen(/Bố chưa xem/));
    await back(); await expectScreen('Bố mẹ hôm nay');
  });
  // Thuốc
  await step('Tab Thuốc', async () => { await tab('Thuốc'); await expectScreen('Thuốc của bố mẹ'); });
  await step('Thuốc › Quét đơn › Quay lại về Thuốc', async () => { await tap('📷  Quét đơn thuốc'); await expectScreen('Thử với đơn thuốc mẫu'); await back(); await expectScreen('Thuốc của bố mẹ'); });
  await step('Quét đơn › đơn mẫu › Quay lại về Quét đơn', async () => { await tap('📷  Quét đơn thuốc'); await tap('Thử với đơn thuốc mẫu'); await expectScreen('Kiểm tra lại đơn thuốc'); await back(); await expectScreen('Thử với đơn thuốc mẫu'); await back(); await expectScreen('Thuốc của bố mẹ'); });
  await step('Thuốc › sửa thuốc › Quay lại về Thuốc', async () => { await tap(/^Aspirin/); await expectScreen('Xóa thuốc này'); await back(); await expectScreen('Thuốc của bố mẹ'); });
  await step('Thuốc › + Thêm thuốc › Quay lại về Thuốc', async () => { await tap('+ Thêm thuốc'); await expectScreen(/Thêm thuốc|Tên thuốc/); await back(); await expectScreen('Thuốc của bố mẹ'); });
  // Đi khám
  await step('Tab Đi khám', async () => { await tab('Đi khám'); await expectScreen('Lịch đi khám'); });
  await step('Đi khám › Chuẩn bị › Quay lại về Đi khám', async () => { await tap(/câu hỏi cho bác sĩ ›/); await expectScreen('Chuẩn bị đi khám'); await back(); await expectScreen('Lịch đi khám'); });
  await step('Chuẩn bị › Ghi buổi khám › Quay lại về Chuẩn bị', async () => { await tap(/câu hỏi cho bác sĩ ›/); await tap('Bắt đầu buổi khám'); await expectScreen('Ghi lại buổi khám'); await back(); await expectScreen('Chuẩn bị đi khám'); });
  await step('Chuẩn bị › Bảng 30 ngày › Quay lại về Chuẩn bị', async () => { await tap('Bảng huyết áp, uống thuốc 30 ngày cho bác sĩ'); await expectScreen(/Tình hình 30 ngày/); await back(); await expectScreen('Chuẩn bị đi khám'); await back(); await expectScreen('Lịch đi khám'); });
  await step('Đi khám › + Thêm lịch › lưu', async () => {
    await tap('+ Thêm lịch'); await p.getByLabel('Khám gì').fill('Khám mắt'); await p.getByLabel('Hoặc gõ ngày khác (ngày/tháng)').fill('20/11');
    await tap('Lưu lịch khám'); await expectScreen(/Khám mắt/);
  });
  // Gia đình, cài đặt
  await step('Đi khám › Chuẩn bị › Sửa ngày giờ, nơi khám › chọn bệnh viện › Lưu › thấy nơi khám', async () => {
    await tap(/câu hỏi cho bác sĩ ›/); await tap('Sửa ngày giờ, nơi khám'); await expectScreen('Sửa lịch khám');
    await p.getByRole('textbox', { name: 'Bệnh viện / phòng khám', exact: true }).first().fill('BV Thống Nhất');
    await tap('Lưu lịch khám', { exact: true }); await expectScreen(/BV Thống Nhất/);
  });
  await step('Thuốc › + Thêm thuốc theo đợt 7 ngày, cách ngày › Lưu › danh sách ghi rõ', async () => {
    await tab('Thuốc'); await p.mouse.move(195, 500); await p.mouse.wheel(0, 4000); await p.waitForTimeout(300); await tap('+ Thêm thuốc');
    await p.getByRole('textbox', { name: 'Tên thuốc và hàm lượng', exact: true }).fill('Amoxicillin 500mg');
    await tap('Cách ngày', { exact: true }); await tap('7 ngày', { exact: true }); await expectScreen(/sau đó máy tự dừng nhắc/);
    await p.mouse.wheel(0, 4000); await p.waitForTimeout(300); await tap('Lưu và tạo lịch nhắc'); await expectScreen('Thuốc của bố mẹ');
    await p.mouse.move(195, 500); await p.mouse.wheel(0, 4000); await p.waitForTimeout(300); await expectScreen(/Cách ngày · Theo đợt: còn 7 ngày/);
  });
  await step('Tab Gia đình', async () => { await tab('Gia đình'); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC'); });
  await step('Gia đình › Gói của gia đình: đang dùng thử, có mã giới thiệu; mã sai bị báo; mã của chính mình bị từ chối', async () => {
    await tap('🎁 Gói của gia đình và giới thiệu bạn bè'); await expectScreen(/Đang dùng thử miễn phí · còn \d+ ngày/);
    await expectScreen('Mã giới thiệu của gia đình bạn'); await expectScreen('119.000đ');
    const own = await p.evaluate(() => [...document.querySelectorAll('div')].map((d) => d.textContent.trim()).find((t) => /^[A-HJ-NP-Z2-9]{6}$/.test(t)));
    await p.getByRole('textbox', { name: 'Mã giới thiệu (6 ký tự)' }).fill('ABC');
    await tap('Áp dụng mã', { exact: true }); await expectScreen(/Mã gồm 6 chữ và số/);
    await p.getByRole('textbox', { name: 'Mã giới thiệu (6 ký tự)' }).fill(own);
    await tap('Áp dụng mã', { exact: true }); await expectScreen('Đây là mã của chính gia đình bạn.');
    await back(); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC');
  });
  await step('Gia đình › Cài đặt › Quay lại về Gia đình', async () => { await tap('Cài đặt (cảnh báo, cỡ chữ)'); await expectScreen('Cỡ chữ trên máy này'); await back(); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC'); });
  await step('Cài đặt › Mức sử dụng › Quay lại về Cài đặt', async () => { await tap('Cài đặt (cảnh báo, cỡ chữ)'); await tap('Mức sử dụng app (thử nghiệm)'); await expectScreen('Mức sử dụng app'); await back(); await expectScreen('Cỡ chữ trên máy này'); await back(); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC'); });
  await step('Cài đặt › chọn chữ "Rất lớn" thì chữ to lên, chọn lại "Bình thường"', async () => {
    const size = () => p.evaluate(() => {
      const e = [...document.querySelectorAll('div,span')].find((x) => x.childElementCount === 0 && x.textContent.startsWith('Chữ mẫu:') && x.getBoundingClientRect().width > 0 && document.elementFromPoint(x.getBoundingClientRect().left + 5, x.getBoundingClientRect().top + 5) === x);
      return e ? parseFloat(getComputedStyle(e).fontSize) : 0;
    });
    await tap('Cài đặt (cảnh báo, cỡ chữ)'); await expectScreen('Cỡ chữ trên máy này');
    const before = await size(); await tap('Rất lớn', { exact: true }); await p.waitForTimeout(300); const after = await size();
    if (!(before > 0 && after >= before * 1.25)) throw new Error(`chữ không to lên (${before} → ${after})`);
    await tap('Bình thường', { exact: true }); await p.waitForTimeout(300);
    if ((await size()) !== before) throw new Error('chọn lại Bình thường không về cỡ cũ');
    await back(); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC');
  });
  await step('Gia đình › + Thêm bố mẹ › Quay lại về Gia đình', async () => { await tap('+ Thêm bố, mẹ, ông, bà'); await expectScreen('Thêm bố hoặc mẹ'); await back(); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC'); });
  await step('Gia đình › thêm người nhận cảnh báo có số', async () => {
    await tap('+ Thêm người nhận cảnh báo'); await p.getByRole('textbox', { name: 'Tên', exact: true }).fill('Cô Bảy'); await p.getByRole('textbox', { name: 'Số điện thoại', exact: true }).last().fill('0912345678');
    await tap('Thêm', { exact: true }); await expectScreen('Cô Bảy');
  });
  await step('Gia đình › đổi thứ tự người nhận cảnh báo; sửa số sai thì chưa lưu được', async () => {
    await p.getByRole('button', { name: 'Đưa Cô Bảy lên trước', exact: true }).first().click();
    await p.getByRole('button', { name: 'Sửa', exact: true }).last().click();
    await p.getByRole('textbox', { name: 'Số điện thoại', exact: true }).last().fill('123');
    await expectScreen(/Số điện thoại chưa đúng/);
    if (await p.getByRole('button', { name: 'Lưu', exact: true }).last().isEnabled()) throw new Error('số sai mà vẫn lưu được');
    await tap('Hủy', { exact: true }); await expectScreen('NGƯỜI ĐƯỢC CHĂM SÓC');
  });
  // Màn hình bố mẹ
  await step('Gia đình › Xem màn hình của bố › hiện hướng dẫn lần đầu', async () => { await tap(/Xem màn hình của bố/); await expectScreen('Hướng dẫn · 1/3'); await expectScreen('Mỗi sáng, bấm nút trắng'); });
  await step('Hướng dẫn: đi hết 3 bước', async () => {
    await tap('Tiếp theo'); await expectScreen('Đến giờ uống thuốc, máy sẽ kêu');
    await tap('Quay lại bước trước'); await expectScreen('Mỗi sáng, bấm nút trắng');
    await tap('Tiếp theo'); await tap('Tiếp theo'); await expectScreen('Cần giúp gấp: giữ nút đỏ');
    await tap('Đã hiểu, bắt đầu dùng'); await expectScreen('Con ơi, bố ổn');
  });
  await step('Hướng dẫn không tự hiện lại; xem lại được', async () => {
    await p.reload(); await expectScreen('Con ơi, bố ổn', 15000);
    if (await onScreen('Hướng dẫn · 1/3')) throw new Error('hướng dẫn hiện lại');
    await tap('Xem lại hướng dẫn'); await expectScreen('Hướng dẫn · 1/3'); await tap('Bỏ qua hướng dẫn'); await expectScreen('Con ơi, bố ổn');
  });
  await step('Bố thấy lời nhắn của con thật to → Đã xem', async () => {
    await expectScreen('“Bố nhớ uống thuốc nhé”'); await expectScreen('Con Hà nhắn bố', 3000).catch(() => expectScreen(/Con Hà nhắn bố/));
    await tap('Đã xem', { exact: true }); await p.waitForTimeout(300);
    if (await onScreen('“Bố nhớ uống thuốc nhé”')) throw new Error('lời nhắn vẫn còn sau khi bấm Đã xem');
  });
  await step('Bố › Chữ to hơn › chọn "Cực lớn" › chữ to lên › về trang chủ', async () => {
    await tap(/Chữ to hơn/); await expectScreen('Chọn cỡ chữ');
    await tap('Dùng cỡ Cực lớn', { exact: true }); await expectScreen('✓ Đang dùng');
    await tap('Xong', { exact: true }); await expectScreen(/đang: Cực lớn/);
    await tap(/Chữ to hơn/); await tap('Dùng cỡ Lớn', { exact: true }); await tap('Xong', { exact: true }); await expectScreen(/đang: Lớn\)/);
  });
  await step('Bố: bấm "ổn" → bấm nhầm, hoàn tác → bấm lại "ổn"', async () => {
    await tap('Con ơi, bố ổn'); await expectScreen(/Bấm nhầm, hoàn tác/); await tap(/Bấm nhầm, hoàn tác/); await expectScreen('Con ơi, bố ổn');
    if (await onScreen(/Đã báo cho các con lúc 13:3/)) throw new Error('hoàn tác rồi mà vẫn báo');
    await tap('Con ơi, bố ổn'); await expectScreen(/Đã báo cho các con lúc 13:3/, 10000);
  });
  await step('Bố › thuốc › "Bố đã uống" → "Đã ghi" (có hoàn tác) → về trang chủ bố', async () => {
    await tap(/Thuốc lần tới|Thuốc bây giờ|Đến giờ/); await expectScreen('Bố đã uống'); await tap('Bố đã uống');
    await expectScreen(/Đã ghi: bố đã uống thuốc 12:00/); await tap('Xong', { exact: true }); await expectScreen('Con ơi, bố ổn');
  });
  await step('Bố › thuốc lần 19:00 chưa đến giờ: không có nút "Đã uống"', async () => {
    await tap(/Thuốc lần tới|Thuốc bây giờ|Đến giờ/); await expectScreen('CHƯA ĐẾN GIỜ');
    if (await onScreen('Bố đã uống')) throw new Error('chưa đến giờ mà vẫn cho bấm Đã uống');
    await tap('Về trang chủ'); await expectScreen('Con ơi, bố ổn');
  });
  await step('Bố › kể con nghe › Quay lại', async () => { await tap(/Kể con nghe/); await expectScreen(/thấy thế nào|Hôm nay/); await back(); await expectScreen('Con ơi, bố ổn'); });
  await step('Bố › Ghi huyết áp › bấm vào số để gõ 165 › có mấy lần đo trước › Quay lại', async () => {
    await tap('🩺 Ghi huyết áp'); await expectScreen('Huyết áp hôm nay');
    await p.getByRole('button', { name: /^Số trên: \d+\. Bấm để gõ số$/ }).first().click();
    const box = p.getByRole('textbox', { name: 'Gõ Số trên' }).first(); await box.fill('165'); await box.press('Enter');
    await expectScreen('165'); await expectScreen('Mấy lần đo trước');
    await back(); await expectScreen('Con ơi, bố ổn');
  });
  await step('Bố › nhập huyết áp › lưu › về', async () => { await tap(/Kể con nghe/); await tap('Nhập huyết áp sáng nay'); await expectScreen(/Huyết áp/); await back(); await expectScreen(/thấy thế nào|Hôm nay/); await back(); await expectScreen('Con ơi, bố ổn'); });
  await step('Bố › SOS bấm nhầm, hủy › về trang chủ bố', async () => {
    const pt = await findPoint({ re: 'SOS · Gọi các con' }); if (!pt) throw new Error('không thấy nút SOS');
    await p.mouse.move(pt.x, pt.y); await p.mouse.down(); await p.clock.runFor(3500); await p.mouse.up();
    await expectScreen('SẮP GỬI SOS'); await tap('Bố bấm nhầm, hủy'); await expectScreen('Con ơi, bố ổn');
  });
  await step('Tải lại trang khi đang ở màn hình bố mẹ', async () => { await p.reload(); await expectScreen('Con ơi, bố ổn', 15000); });
  await step('Bố › Đổi vai trò › về chọn vai trò', async () => { await tap('Đổi vai trò (bản thử)'); await expectScreen('Ai đang dùng điện thoại này?'); });
  await step('Quay về màn hình con với gia đình đã có', async () => { await tap(/Tiếp tục với gia đình đã có/); await expectScreen('Bố mẹ hôm nay'); });
  await step('Con thấy bố đã bấm "ổn" và uống thuốc 12:00', async () => {
    await expectScreen(/^13:3\d · Khỏe$/); await expectScreen('2/3 lần');
    if (await onScreen('Bố Hùng chưa uống thuốc 12:00')) throw new Error('vẫn báo bố chưa uống 12:00');
  });
  await step('Cài đặt có Chính sách quyền riêng tư', async () => { await tab('Gia đình'); await tap('Cài đặt (cảnh báo, cỡ chữ)'); await tap('Chính sách quyền riêng tư'); await expectScreen('1. Chúng tôi thu thập gì'); await back(); await expectScreen('Cỡ chữ trên máy này'); await back(); });
  await step('Tải lại trang ở màn hình con: dữ liệu còn nguyên', async () => { await p.reload(); await expectScreen('2/3 lần', 15000); });

console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi. Lỗi trang: ${errs.length ? errs.join(' | ') : 'không'}`);
if (fail) console.log(`Ảnh màn hình lúc lỗi: ${SHOTS}`);
await b.close();
server.close();
process.exit(fail || errs.length ? 1 : 0);
