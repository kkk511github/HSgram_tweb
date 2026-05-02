# HSgram Web 部署说明

这个 tweb 分支已适配 HSgram Server，可以通过 gnetway WebSocket 入口连接后端。

当前线上访问地址：

```text
http://43.134.228.34:8080/
```

当前服务器静态文件目录：

```text
/home/ubuntu/HSgram/HSgram_tweb_dist
```

当前 Web 容器名：

```text
hsgram_tweb_web
```

## 后端 WebSocket

HSgram Server Docker 配置需要暴露 gnetway WebSocket，容器内端口为 `8801`：

```yaml
Gnetway:
  Server:
    - Proto: tcp
      Addresses:
        - 0.0.0.0:10443
        - 0.0.0.0:5222
        - 0.0.0.0:11443
    - Proto: websocket
      Addresses:
        - 0.0.0.0:8801
```

生产环境建议用 Nginx 或 Caddy 终止 TLS，然后把公开的 WSS 入口反代到 Teamgram WebSocket `8801`。

当前 `43.134.228.34` 服务器上，宿主机 `443` 已映射给 MTProto TCP `10443`。
因此有两种部署方式：

1. 继续用 HTTP `8080` 提供网页，并在同一个 Nginx 容器里把 `/apiws` 反代到 `hsgram_server-teamgram-1:8801`。
2. 把 MTProto TCP 从宿主机 `443` 移走，再让 Nginx 或 Caddy 监听 `443`，把 `/apiws` 反代到 Teamgram WebSocket，实现 HTTPS/WSS。

Nginx 反代示例：

```nginx
location /apiws {
  proxy_pass http://hsgram_server-teamgram-1:8801;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

完整可用的 Nginx 配置见 `deploy/nginx.hsgram.conf`。

## 前端环境变量

复制示例环境变量：

```bash
cp .env.hsgram.example .env.local
```

当前 HTTP 部署使用：

```env
VITE_MTPROTO_WS_URL=ws://43.134.228.34:8080/apiws
VITE_MTPROTO_BASE_DC_ID=1
VITE_MTPROTO_HAS_WS=1
VITE_MTPROTO_HAS_HTTP=
VITE_MTPROTO_AUTO=
```

如果后续切到 HTTPS 域名，改成：

```env
VITE_MTPROTO_WS_URL=wss://YOUR_DOMAIN/apiws
```

## 构建

推荐使用 pnpm：

```bash
pnpm install
pnpm run build
```

如果当前环境没有全局 `pnpm`，但依赖已经安装，可以直接执行：

```bash
node ./src/scripts/generate_changelog.js
./node_modules/.bin/vite build
```

构建产物在 `dist/`。因为项目配置了 `copyPublicDir: false`，部署包需要包含两类文件：

- `dist/` 的全部新构建文件。
- `public/` 里的静态运行时资源，例如 `assets/`、`changelogs/`、`decoderWorker.min.*`、`encoderWorker.min.*`、`rlottie-wasm.*`、`waveWorker.min.js`、站点 manifest 等。

不要把 `public/` 根目录下旧的 hashed JS/CSS/map 构建残留直接覆盖到线上；这些文件是历史构建产物，会污染发布目录。

## 部署到当前 Ubuntu 服务器

本地生成干净发布目录并打包：

```bash
rm -rf /tmp/hsgram-tweb-release
mkdir -p /tmp/hsgram-tweb-release
cp -R dist/. /tmp/hsgram-tweb-release/
cp -R public/assets /tmp/hsgram-tweb-release/assets
cp -R public/changelogs /tmp/hsgram-tweb-release/changelogs
cp public/browserconfig.xml public/site.webmanifest public/site_apple.webmanifest public/snapshot.html /tmp/hsgram-tweb-release/
cp public/decoderWorker.min.js public/decoderWorker.min.wasm /tmp/hsgram-tweb-release/
cp public/encoderWorker.min.js public/encoderWorker.min.wasm /tmp/hsgram-tweb-release/
cp public/recorder.min.js public/rlottie-wasm.js public/rlottie-wasm.wasm public/waveWorker.min.js /tmp/hsgram-tweb-release/
tar -C /tmp/hsgram-tweb-release -czf /tmp/hsgram-tweb-dist.tgz .
```

上传：

```bash
scp /tmp/hsgram-tweb-dist.tgz ubuntu@43.134.228.34:/tmp/hsgram-tweb-dist.tgz
```

服务器上发布：

```bash
ssh ubuntu@43.134.228.34
mkdir -p /home/ubuntu/HSgram/HSgram_tweb_dist
find /home/ubuntu/HSgram/HSgram_tweb_dist -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -C /home/ubuntu/HSgram/HSgram_tweb_dist -xzf /tmp/hsgram-tweb-dist.tgz
rm -f /tmp/hsgram-tweb-dist.tgz
docker exec hsgram_tweb_web nginx -s reload
```

如果怀疑容器缓存或浏览器拿到旧 `index.html`，可以额外清理并重载：

```bash
docker exec hsgram_tweb_web sh -lc 'rm -rf /var/cache/nginx/* 2>/dev/null || true'
docker exec hsgram_tweb_web nginx -s reload
```

## 上线检查

检查 HTTP 与缓存头：

```bash
curl -I http://43.134.228.34:8080/
```

需要看到：

```text
HTTP/1.1 200 OK
Cache-Control: no-cache, no-store, must-revalidate
```

检查静态文件是否是新构建：

```bash
curl -s http://43.134.228.34:8080/index.html | grep -E 'index-.*\.js'
```

检查 WebSocket 代理入口是否存在：

```bash
curl -i \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==' \
  -H 'Sec-WebSocket-Version: 13' \
  http://43.134.228.34:8080/apiws
```

正常情况下不应返回静态页面内容；如果返回 `404` 或 `index.html`，说明 `/apiws` 没有正确反代。

## HSgram 定制验证

中文界面：

- `src/config/app.ts` 默认语言为 `classic-zh-cn`。
- `src/lang.zh-cn.ts` 与 `src/langSign.zh-cn.ts` 是本地中文包。
- 修改中文包后需要递增 `src/langPackLocalVersion.example.ts`，否则用户浏览器可能继续使用 IndexedDB 中的旧语言包。

超级群和禁止私聊：

- 新建群组应由后端创建为超级群，Web 端沿用服务端返回的群类型和权限。
- 群主或管理员进入超级群资料页，点击“编辑”，应看到“成员互动”分组。
- “成员互动”下有“禁止私聊”开关。
- 开关调用 `messages.toggleNoForwards`，并携带 HSgram 约定的 `request_msg_id = -10086`，用于和移动端、桌面端保持一致。

浏览器缓存：

- 正常刷新即可加载新 `index.html`，因为 Nginx 已对入口文件设置 `no-cache, no-store`。
- 如果 Safari 仍显示旧英文文案，优先强制刷新或使用带版本号的 URL，例如 `http://43.134.228.34:8080/?v=deploy-check`。
- 仍不生效时清理该站点数据，再重新登录验证。

## 密钥说明

前端内置 RSA 公钥与 `HSgram_server/teamgramd/bin/server_pkcs1.key` 匹配，指纹为：

```text
12240908862933197005
```
