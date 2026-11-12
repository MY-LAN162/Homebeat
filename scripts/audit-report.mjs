// Tạo trang báo cáo kiểm tra nút (từ .e2e/audit/result.json của npm run audit:buttons).
// Chạy: node scripts/audit-report.mjs <file ra .html>
import fs from 'node:fs';
import path from 'node:path';

const AUD = path.resolve('.e2e/audit');
const out = process.argv[2] ?? path.join(AUD, 'bao-cao-nut.html');
const R = JSON.parse(fs.readFileSync(path.join(AUD, 'result.json'), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Nút "không thấy thay đổi" mà mình đã kiểm tra là đúng (chạy trên điện thoại, hoặc đang ở đúng chỗ đó rồi).
const EXPLAIN = [
  [/^Đọc to/, 'Đọc to bằng giọng nói: trình duyệt thử nghiệm không phát tiếng, trên điện thoại sẽ đọc.'],
  [/SOS · Gọi các con/, 'Nút SOS phải GIỮ 3 giây (chống bấm nhầm); bấm nhẹ thì không gửi. Đúng thiết kế.'],
  [/^⏷⏷/, 'Thẻ của màn hình đang mở: bấm lại thì vẫn ở đó.'],
  [/^Xóa hết$|^Xóa 1 số$/, 'Ô mã đang trống nên chưa có gì để xóa.'],
  [/^Nạp dữ liệu mẫu$/, 'Đang ở dữ liệu mẫu rồi: nạp lại vẫn giống hệt.'],
];
const KIND = { nav: ['Mở màn hình', 'ok'], change: ['Đổi trên màn hình', 'ok'], select: ['Được chọn', 'ok'], dialog: ['Hỏi lại / thông báo', 'ok'], external: ['Ra ngoài app', 'ok'], disabled: ['Đang khóa', 'muted'], none: ['Không thấy thay đổi', 'warn'], error: ['Lỗi', 'bad'] };

let total = 0, ok = 0, explained = 0, bad = 0, disabled = 0;
const sections = R.map((s) => {
  const img = fs.readFileSync(path.join(AUD, s.shot)).toString('base64');
  const rows = s.buttons.map((b) => {
    total++;
    let [label, tone] = KIND[b.kind] ?? ['?', 'warn'];
    let note = b.outcome;
    if (b.kind === 'none') {
      const ex = EXPLAIN.find(([re]) => re.test(b.label));
      if (ex) { tone = 'ok'; label = 'Đúng (giải thích)'; note = ex[1]; explained++; } else bad++;
    } else if (b.kind === 'error') bad++;
    else if (b.kind === 'disabled') disabled++;
    else ok++;
    return `<tr class="${tone}"><td>${esc(b.label.replace(/^⏷⏷/, '') || '(biểu tượng)')}</td><td><span class="tag ${tone}">${label}</span></td><td>${esc(note)}</td></tr>`;
  }).join('');
  const warn = s.buttons.filter((b) => (b.kind === 'none' && !EXPLAIN.some(([re]) => re.test(b.label))) || b.kind === 'error').length;
  return `<section class="screen" id="s${esc(s.shot)}"><div class="shot"><img alt="Ảnh màn hình ${esc(s.name)}" src="data:image/jpeg;base64,${img}"></div><div class="info"><h3>${esc(s.name)} <small>${s.buttons.length} nút${warn ? ` · <b class="w">${warn} cần xem</b>` : ''}</small></h3><div class="tbl"><table><thead><tr><th>Nút</th><th>Kết quả</th><th>Bấm vào thì</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`;
}).join('');

const FEATURES = [
  ['Đã có, chạy thử được trên trình duyệt', 'ok', [
    'Bắt đầu: chọn vai trò, con thêm bố mẹ (bắt buộc số điện thoại người nhận cảnh báo), mã kết nối 6 số, bố mẹ nhập mã, con bấm Đồng ý, lấy lại gia đình khi đổi máy',
    'Bố mẹ: nút “Con ơi, bố ổn” (hoàn tác 6 giây), uống thuốc (chặn uống sớm, nửa viên, hoàn tác, hết thuốc / không uống được báo con), huyết áp gõ thẳng, kể con nghe hôm nay, SOS giữ 3 giây, gọi con, 4 cỡ chữ, lời nhắn của con chữ to',
    'Con: trang chủ có cảnh báo, thuốc (quét đơn mẫu / gõ, theo đợt, cách ngày, theo thứ, đã mua thêm), lịch khám (sửa, xóa, chọn ngày, chỉ đường, câu hỏi cho bác sĩ, ghi lời bác sĩ, tóm tắt), nhắn bố mẹ, chi tiết từng người, báo cáo 7/30/90 ngày, gói và mã giới thiệu',
    'Gia đình: người nhận cảnh báo (sửa, đổi thứ tự, kiểm tra số), mời anh chị em, danh sách máy, xóa dữ liệu, cài đặt ngưỡng cảnh báo, nhắc đo huyết áp, tóm tắt 20:00, khóa app, chính sách quyền riêng tư',
  ]],
  ['Đã có, cần điện thoại thật để kiểm tra', 'mid', [
    'Chuông và rung theo 3 mức (SOS âm riêng, cần chú ý, thông tin im lặng), thử chuông',
    'Nhắc uống thuốc đúng giờ khi máy khóa, nút “Đã uống” ngay trên thông báo, nhắc lại 2 lần, nhắc lịch khám, nhắc đo huyết áp',
    'Chạy nền 15–60 phút: báo trễ thuốc, mất tín hiệu, pin yếu, máy bố mẹ tắt thông báo, tóm tắt 20:00',
    'SOS gọi điện, nhắn tin kèm vị trí; đọc to bằng giọng tiếng Việt; khóa app bằng vân tay',
    'Hai máy báo cho nhau qua máy chủ (đã thử bằng máy chủ giả lập; cần Firebase thật)',
  ]],
  ['Chưa có (còn phải làm)', 'bad', [
    'Chụp ảnh viên thuốc bằng camera (hiện chỉ hiện ảnh nếu có sẵn)',
    'Đọc chữ trên ảnh đơn thuốc bằng camera: hiện chỉ dùng đơn mẫu hoặc gõ / dán chữ',
    'Ghi âm lời bác sĩ thành chữ trên điện thoại: hiện chỉ chạy trên trình duyệt Chrome; trên điện thoại phải gõ tay',
    'Hồ sơ sức khỏe bố mẹ (bệnh nền, dị ứng, nhóm máu, BHYT) để gửi kèm SOS và báo cáo bác sĩ',
    'Thanh toán thật qua Google Play / App Store (làm cuối, tốn phí)',
  ]],
];
const feat = FEATURES.map(([h, tone, items]) => `<div class="fbox ${tone}"><h3>${h}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');

const html = `<title>Kiểm tra nút An Tâm</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap">
<style>
/* Báo cáo kiểm tra: tóm tắt trên cùng, rồi từng màn hình (ảnh bên trái, bảng nút bên phải). Màu theo app An Tâm. */
:root { --bg:#F6F1E9; --card:#FFFFFF; --ink:#1F2A28; --muted:#5E6663; --line:#E7E0D4; --ok:#1F6F5C; --okbg:#DCEBE4; --warn:#7A3606; --warnbg:#FBE9D9; --bad:#B42318; --badbg:#FDE4E1; --mid:#1E3F6E; --midbg:#E1EAF6; --font:'Be Vietnam Pro',system-ui,sans-serif }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#141B19; --card:#1D2624; --ink:#EDE8DF; --muted:#A6AEAA; --line:#2E3936; --ok:#7FD3B9; --okbg:#1B372F; --warn:#F2C7A0; --warnbg:#3A2716; --bad:#F8B1A9; --badbg:#431D19; --mid:#B7CEEF; --midbg:#1C2A3E; color-scheme:dark } }
:root[data-theme="dark"] { --bg:#141B19; --card:#1D2624; --ink:#EDE8DF; --muted:#A6AEAA; --line:#2E3936; --ok:#7FD3B9; --okbg:#1B372F; --warn:#F2C7A0; --warnbg:#3A2716; --bad:#F8B1A9; --badbg:#431D19; --mid:#B7CEEF; --midbg:#1C2A3E; color-scheme:dark }
body { background:var(--bg); color:var(--ink); font:16px/1.55 var(--font); margin:0 }
.wrap { max-width:1100px; margin:0 auto; padding-block:28px 56px; padding-left:max(16px,env(safe-area-inset-left,0px)); padding-right:max(16px,env(safe-area-inset-right,0px)); display:grid; gap:24px }
h1 { font-size:clamp(26px,4vw,36px); margin:0; text-wrap:balance } h2 { margin:8px 0 0; font-size:22px } h3 { margin:0; font-size:18px }
.muted { color:var(--muted) }
.stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px } @media (max-width:640px){ .stats{grid-template-columns:repeat(2,minmax(0,1fr))} }
.stat { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px } .stat b { display:block; font-size:30px; font-variant-numeric:tabular-nums }
.feats { display:grid; gap:12px } .fbox { border-radius:16px; padding:16px 18px } .fbox ul { margin:8px 0 0; padding-left:20px; display:grid; gap:6px }
.fbox.ok { background:var(--okbg) } .fbox.mid { background:var(--midbg) } .fbox.bad { background:var(--badbg) }
.screen { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; display:grid; grid-template-columns:220px minmax(0,1fr); gap:18px; align-items:start }
@media (max-width:760px){ .screen{grid-template-columns:minmax(0,1fr)} .shot{max-width:240px} }
.shot img { width:100%; border-radius:12px; border:1px solid var(--line); display:block } .info { display:grid; gap:10px; min-width:0 }
h3 small { font-weight:600; color:var(--muted); font-size:14px } .w { color:var(--warn) }
.tbl { overflow-x:auto } table { width:100%; border-collapse:collapse; font-size:14px } th { text-align:left; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.05em; padding:6px 8px; border-bottom:1px solid var(--line) }
td { padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top } td:first-child { font-weight:600; min-width:120px }
.tag { font-size:12px; font-weight:700; border-radius:999px; padding:2px 8px; white-space:nowrap } .tag.ok { background:var(--okbg); color:var(--ok) } .tag.warn { background:var(--warnbg); color:var(--warn) } .tag.bad { background:var(--badbg); color:var(--bad) } .tag.muted { background:var(--line); color:var(--muted) }
</style>
<div class="wrap">
  <header><h1>Kiểm tra từng nút của An Tâm</h1><p class="muted">Robot mở ${R.length} màn hình của máy con và máy bố mẹ (dữ liệu mẫu), bấm lần lượt từng nút trong một trình duyệt mới, rồi ghi lại nút đó làm gì. Nút “Đang khóa” là nút chưa đủ điều kiện để bấm (ví dụ chưa nhập tên).</p></header>
  <div class="stats">
    <div class="stat"><b>${total}</b><span class="muted">nút đã bấm thử</span></div>
    <div class="stat"><b>${ok + explained}</b><span class="muted">chạy đúng</span></div>
    <div class="stat"><b>${disabled}</b><span class="muted">đang khóa đúng lúc</span></div>
    <div class="stat"><b>${bad}</b><span class="muted">cần xem lại</span></div>
  </div>
  <h2>Tính năng</h2>
  <div class="feats">${feat}</div>
  <h2>Từng màn hình</h2>
  ${sections}
</div>
`;
fs.writeFileSync(out, html);
console.log(`Đã tạo ${out}: ${total} nút, chạy đúng ${ok + explained}, khóa ${disabled}, cần xem ${bad}`);
