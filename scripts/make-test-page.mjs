// Đóng gói bản web của app thành 1 trang cho Artifact (trang dùng thử).
// Trang Artifact chỉ phục vụ đúng 1 đường dẫn, nên app dùng "đường dẫn ảo" trong bộ nhớ: toàn bộ mã app
// chạy trong một hàm nhận window/location/history giả; đường dẫn thật không đổi, tải lại không bị "not found".
// Dùng: node scripts/make-test-page.mjs <thư mục>   (cần <thư mục>/web-demo từ: npx expo export -p web --output-dir <thư mục>/web-demo)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHIM = "\n(function () {\n  var realLoc = window.location, realHist = window.history;\n  var vp = '/';            // \u0111\u01b0\u1eddng d\u1eabn \u1ea3o c\u1ee7a app\n  function setVp(url) {\n    if (url == null) return;\n    try { var u = new URL(String(url), realLoc.origin + vp); vp = u.pathname + u.search; } catch (e) {}\n  }\n  window.addEventListener('popstate', function (e) {\n    vp = (e.state && e.state.__vp) || '/';\n  }, true);\n  var fakeLoc = {\n    get pathname() { return vp.split('?')[0]; },\n    get search() { var i = vp.indexOf('?'); return i < 0 ? '' : vp.slice(i); },\n    get hash() { return realLoc.hash; },\n    get origin() { return realLoc.origin; },\n    get protocol() { return realLoc.protocol; },\n    get host() { return realLoc.host; },\n    get hostname() { return realLoc.hostname; },\n    get port() { return realLoc.port; },\n    get href() { return realLoc.origin + vp + realLoc.hash; },\n    assign: function (u) { setVp(u); }, replace: function (u) { setVp(u); },\n    reload: function () { realLoc.reload(); }, toString: function () { return this.href; }\n  };\n  var fakeHist = {\n    pushState: function (s, t, u) { setVp(u); realHist.pushState(Object.assign({}, s, { __vp: vp }), t); },\n    replaceState: function (s, t, u) { setVp(u); realHist.replaceState(Object.assign({}, s, { __vp: vp }), t); },\n    go: function (n) { realHist.go(n); }, back: function () { realHist.back(); }, forward: function () { realHist.forward(); },\n    get state() { return realHist.state; }, get length() { return realHist.length; },\n    get scrollRestoration() { return realHist.scrollRestoration; }, set scrollRestoration(v) { realHist.scrollRestoration = v; }\n  };\n  try { realHist.replaceState({ __vp: '/' }, ''); } catch (e) {}\n  window.__antam = {\n    loc: fakeLoc, hist: fakeHist,\n    win: new Proxy(window, {\n      get: function (t, p) {\n        if (p === 'location') return fakeLoc;\n        if (p === 'history') return fakeHist;\n        var v = Reflect.get(t, p, t);\n        return typeof v === 'function' && !('prototype' in v) ? v.bind(t) : v;\n      },\n      set: function (t, p, v) { return Reflect.set(t, p, v, t); }\n    })\n  };\n})();\n";

export function makeTestPage(dir) {
  const jsDir = path.join(dir, 'web-demo/_expo/static/js/web');
  const file = fs.readdirSync(jsDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  const js = fs.readFileSync(path.join(jsDir, file), 'utf8');
  if (js.toLowerCase().includes('</script')) throw new Error('Mã app có chuỗi </script, không nhúng được');
  const html = [
    '<title>An Tâm</title>',
    '<style>',
    '/* Bản dùng thử của app An Tâm (Expo web). App tự vẽ giao diện, chỉ một kiểu sáng như bản thiết kế. */',
    ':root { --bg: #F6F1E9; --fg: #1F2A28; color-scheme: light; }',
    'html, body { height: 100%; }',
    'body { overflow: hidden; background: var(--bg); color: var(--fg); }',
    '#root { display: flex; height: 100%; flex: 1; }',
    '</style>',
    '<div id="root"></div>',
    '<script>', SHIM, '</script>',
    '<script>',
    '(function (window, location, history) {',
    js,
    '}).call(window, window.__antam.win, window.__antam.loc, window.__antam.hist);',
    '</script>',
    '',
  ].join('\n');
  fs.mkdirSync(path.join(dir, 'artifact'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'artifact/an-tam.html'), html);
  return html;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = makeTestPage(process.argv[2] ?? '.e2e');
  console.log(`Đã tạo trang dùng thử (${Math.round(html.length / 1024)} KB)`);
}
