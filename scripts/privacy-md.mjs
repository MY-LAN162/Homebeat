// Tạo PRIVACY.md từ nội dung chính sách trong app (src/domain/privacy.ts), để hai bản luôn giống nhau.
// Chạy: node --experimental-strip-types scripts/privacy-md.mjs
import fs from 'node:fs';
const { PRIVACY_SECTIONS, PRIVACY_SUMMARY, PRIVACY_UPDATED, PRIVACY_VERSION } = await import('../src/domain/privacy.ts');
const lines = [
  '# Chính sách quyền riêng tư — An Tâm',
  '',
  `Phiên bản ${PRIVACY_VERSION}, cập nhật ${PRIVACY_UPDATED}. **Bản nháp — cần luật sư xem lại trước khi phát hành** (thông tin sức khỏe là dữ liệu cá nhân nhạy cảm theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân).`,
  '',
  '## Tóm tắt',
  '',
  ...PRIVACY_SUMMARY.map((s) => `- ${s}`),
  '',
  ...PRIVACY_SECTIONS.flatMap((sec) => [`## ${sec.title}`, '', ...sec.items.map((i) => `- ${i}`), '']),
  '_File này được tạo tự động từ `src/domain/privacy.ts` (lệnh `npm run privacy-md`). Sửa nội dung ở đó, không sửa trực tiếp file này._',
  '',
];
fs.writeFileSync('PRIVACY.md', lines.join('\n'));
console.log('Đã tạo PRIVACY.md');
