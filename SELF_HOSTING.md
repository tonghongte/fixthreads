# Self-Hosting Guide (Portainer / Docker Compose)

> **注意**：此專案已 archived。Meta 封鎖了 API 帳號，登入功能可能無法正常運作。

## 1. 確認 GHCR Image

`build.sh` 會將 image 推送至：

```
ghcr.io/milanmdev/fixthreads:latest
```

---

## 2. 準備主機目錄與設定檔

> 以下為 Windows（Docker Desktop）環境，使用 PowerShell 執行。

```powershell
# 建立目錄
New-Item -ItemType Directory -Force -Path C:\fixthreads\config
New-Item -ItemType Directory -Force -Path C:\fixthreads\generated

# 建立 users.json（可放多組帳號輪替）
@'
[
  {
    "id": 1,
    "username": "你的_IG帳號",
    "password": "你的_IG密碼",
    "deviceId": ""
  }
]
'@ | Set-Content -Encoding UTF8 C:\fixthreads\config\users.json

# 建立空的 token cache 檔
'{"token":"","timestamp":0,"username":""}' | Set-Content -Encoding UTF8 C:\fixthreads\generated\token.json
```

volumes 路徑對應改為 Windows 格式：

```yaml
    volumes:
      - C:\fixthreads\config\users.json:/build/config/users.json:ro
      - C:\fixthreads\generated:/build/generated
```

---

## 3. Portainer Stack Compose（基本）

在 Portainer → Stacks → Add stack，貼上以下內容：

```yaml
version: "3.8"

services:
  fixthreads:
    image: ghcr.io/milanmdev/fixthreads:latest
    container_name: fixthreads
    restart: unless-stopped

    ports:
      - "3000:3000"       # 左邊是主機 port，右邊是容器內部固定 3000

    environment:
      - ENVIRONMENT=production   # 切換 oembed URL 模式（見說明）
      - PROXIES=                 # 選填：影片 proxy 主機，逗號分隔

    volumes:
      - C:\fixthreads\config\users.json:/build/config/users.json:ro
      - C:\fixthreads\generated:/build/generated
```

---

## 4. 環境變數說明

| 變數 | 必填 | 說明 |
|------|------|------|
| `ENVIRONMENT` | 否 | 設為 `production` 時，oembed 連結指向 `fixthreads.net`；其他值指向 `local.milanm.cc` |
| `PROXIES` | 否 | Instagram 影片代理主機，逗號分隔，例如 `proxy1.example.com,proxy2.example.com`。用於繞過直接存取 Instagram 影片 CDN 的限制 |

---

## 5. Port 說明

- 容器內部固定監聽 **3000**（`src/index.ts` 寫死）
- `ports` 左側可改成任何你想要的主機 port，例如 `8080:3000`

---

## 6. 自訂網域設定

### 方法 A：Traefik（不對外開放 port）

```yaml
version: "3.8"

services:
  fixthreads:
    image: ghcr.io/milanmdev/fixthreads:latest
    container_name: fixthreads
    restart: unless-stopped

    environment:
      - ENVIRONMENT=production
      - PROXIES=

    volumes:
      - C:\fixthreads\config\users.json:/build/config/users.json:ro
      - C:\fixthreads\generated:/build/generated

    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fixthreads.rule=Host(`fixthreads.你的網域.com`)"
      - "traefik.http.routers.fixthreads.entrypoints=websecure"
      - "traefik.http.routers.fixthreads.tls.certresolver=letsencrypt"
      - "traefik.http.services.fixthreads.loadbalancer.server.port=3000"

    networks:
      - traefik_network

networks:
  traefik_network:
    external: true
```

### 方法 B：Nginx Proxy Manager

1. 部署時保留 `ports: - "3000:3000"`
2. 在 NPM 新增 Proxy Host：
   - **Domain**：`fixthreads.你的網域.com`
   - **Forward Hostname**：主機 IP 或容器名
   - **Forward Port**：`3000`
   - 開啟 SSL + Force HTTPS

---

## 7. 重要限制

`ENVIRONMENT=production` 時，oembed 的 `<link>` 標籤會硬指向 `https://fixthreads.net`（`src/utils/renderSeo.ts`），**無法透過環境變數改成自己的網域**。若要完整自訂，需修改 `renderSeo.ts`，加入 `SITE_URL` 環境變數。

---

## 8. 驗證是否正常運作

```bash
# 健康檢查
curl http://localhost:3000/health

# 預期回應
{"status":"ok","version":"1.7.7"}
```
