// Đóng gói trang web sản phẩm để đưa lên Firebase Hosting:
//   web/an-tam-web.html (nguồn, dạng trang Artifact) -> landing/index.html (trang chủ)
//   landing/tai.html: trang ngắn tải app + nhập mã (đường dẫn /tai)
// Chạy: node scripts/make-web.mjs  rồi  npx firebase-tools deploy --only hosting,firestore:rules
import fs from 'node:fs';

const src = fs.readFileSync('web/an-tam-web.html', 'utf8');
const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta property="og:title" content="An Tâm: nhắc bố mẹ uống thuốc, báo cho con khi cần">
<meta property="og:description" content="Mỗi sáng một lời “Con ơi, bố ổn”. Dùng thử miễn phí 30 ngày.">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${src}
</body>
</html>
`;
fs.writeFileSync('landing/index.html', html);
console.log('Đã tạo landing/index.html (' + Math.round(html.length / 1024) + ' KB). Trang tải app: landing/tai.html');
