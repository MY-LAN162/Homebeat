# Đóng gói bản web của app thành 1 trang cho Artifact.
# Trang Artifact chỉ phục vụ đúng 1 đường dẫn, nên app phải dùng "đường dẫn ảo" trong bộ nhớ:
# toàn bộ mã app chạy trong một hàm nhận window/location/history giả; đường dẫn thật không bao giờ đổi,
# nên tải lại trang (hoặc khi Claude cập nhật bản mới) không bị "not found".
import sys, glob
sp = sys.argv[1]  # thư mục chứa web-demo/ (từ: npx expo export -p web --output-dir <sp>/web-demo)
import os; os.makedirs(sp + '/artifact', exist_ok=True)
js = open(glob.glob(sp + '/web-demo/_expo/static/js/web/entry-*.js')[0]).read()
assert '</script' not in js.lower()

SHIM = r"""
(function () {
  var realLoc = window.location, realHist = window.history;
  var vp = '/';            // đường dẫn ảo của app
  function setVp(url) {
    if (url == null) return;
    try { var u = new URL(String(url), realLoc.origin + vp); vp = u.pathname + u.search; } catch (e) {}
  }
  window.addEventListener('popstate', function (e) {
    vp = (e.state && e.state.__vp) || '/';
  }, true);
  var fakeLoc = {
    get pathname() { return vp.split('?')[0]; },
    get search() { var i = vp.indexOf('?'); return i < 0 ? '' : vp.slice(i); },
    get hash() { return realLoc.hash; },
    get origin() { return realLoc.origin; },
    get protocol() { return realLoc.protocol; },
    get host() { return realLoc.host; },
    get hostname() { return realLoc.hostname; },
    get port() { return realLoc.port; },
    get href() { return realLoc.origin + vp + realLoc.hash; },
    assign: function (u) { setVp(u); }, replace: function (u) { setVp(u); },
    reload: function () { realLoc.reload(); }, toString: function () { return this.href; }
  };
  var fakeHist = {
    pushState: function (s, t, u) { setVp(u); realHist.pushState(Object.assign({}, s, { __vp: vp }), t); },
    replaceState: function (s, t, u) { setVp(u); realHist.replaceState(Object.assign({}, s, { __vp: vp }), t); },
    go: function (n) { realHist.go(n); }, back: function () { realHist.back(); }, forward: function () { realHist.forward(); },
    get state() { return realHist.state; }, get length() { return realHist.length; },
    get scrollRestoration() { return realHist.scrollRestoration; }, set scrollRestoration(v) { realHist.scrollRestoration = v; }
  };
  try { realHist.replaceState({ __vp: '/' }, ''); } catch (e) {}
  window.__antam = {
    loc: fakeLoc, hist: fakeHist,
    win: new Proxy(window, {
      get: function (t, p) {
        if (p === 'location') return fakeLoc;
        if (p === 'history') return fakeHist;
        var v = Reflect.get(t, p, t);
        return typeof v === 'function' && !('prototype' in v) ? v.bind(t) : v;
      },
      set: function (t, p, v) { return Reflect.set(t, p, v, t); }
    })
  };
})();
"""

html = f'''<title>An Tâm</title>
<style>
/* Bản dùng thử của app An Tâm (Expo web). App tự vẽ giao diện, chỉ một kiểu sáng như bản thiết kế. */
:root {{ --bg: #F6F1E9; --fg: #1F2A28; color-scheme: light; }}
html, body {{ height: 100%; }}
body {{ overflow: hidden; background: var(--bg); color: var(--fg); }}
#root {{ display: flex; height: 100%; flex: 1; }}
</style>
<div id="root"></div>
<script>
{SHIM}
</script>
<script>
(function (window, location, history) {{
{js}
}}).call(window, window.__antam.win, window.__antam.loc, window.__antam.hist);
</script>
'''
open(sp + '/artifact/an-tam.html', 'w').write(html)
open(sp + '/artifact/wrapped.html', 'w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + html + '</body></html>')
print(len(html) // 1024, 'KB')
