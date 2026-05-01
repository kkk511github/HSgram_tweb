# HSgram Server Web Deployment

This tweb fork can connect to HSgram Server through the gnetway WebSocket entry.

## Server side

HSgram Server Docker config exposes gnetway WebSocket on container port `8801`:

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

For production, terminate TLS with Nginx or Caddy and proxy a public WSS endpoint to the Teamgram WebSocket listener on `8801`.

On the current `43.134.228.34` server, host port `443` is already mapped to the MTProto TCP entry `10443`.
That means there are two practical deployment modes:

1. Serve the web app over plain HTTP on `8080` and proxy `/apiws` through the same Nginx container to `hsgram_server-teamgram-1:8801`.
2. Move MTProto TCP away from host `443`, then put Nginx or Caddy on `443` and proxy `/apiws` to the Teamgram WebSocket listener for HTTPS/WSS.

Example Nginx location:

```nginx
location /apiws {
  proxy_pass http://hsgram_server-teamgram-1:8801;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## tweb side

Copy the example env file and set your domain:

```bash
cp .env.hsgram.example .env.local
```

Edit:

```env
VITE_MTPROTO_WS_URL=ws://43.134.228.34:8080/apiws
VITE_MTPROTO_BASE_DC_ID=1
VITE_MTPROTO_HAS_WS=1
VITE_MTPROTO_HAS_HTTP=
VITE_MTPROTO_AUTO=
```

For HTTPS/domain deployments, use `wss://YOUR_DOMAIN/apiws` instead.

Then build:

```bash
pnpm install
node build
```

Deploy the generated static files with a web server. The included `deploy/nginx.hsgram.conf` serves the SPA and proxies `/apiws` to the Teamgram WebSocket listener when the web container is on the same Docker network as Teamgram.

If `pnpm` is only available through Corepack, run `corepack enable` first or build with `corepack pnpm exec vite build` and deploy the generated `dist/` directory.

The bundled RSA public key matches `HSgram_server/teamgramd/bin/server_pkcs1.key` with fingerprint `12240908862933197005`.
