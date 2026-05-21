# AgileTools

## Planning Poker（Web）

Monorepo：`apps/web`（Next.js 14）與 `apps/server`（NestJS 11 + Socket.IO）。

### 本機開發

1. 在 repo 根目錄安裝依賴：`npm install`
2. 複製環境變數範例：
   - `apps/server/.env.example` → `apps/server/.env`（可選）
   - `apps/web/.env.example` → `apps/web/.env.local`（可選；設定 `NEXT_PUBLIC_WS_ORIGIN` 指向後端）
3. 開發模式擇一：
   - **一鍵前後端**：`npm run dev` 或 `make dev`（並行啟動 server + web；後端在 **成功 listen** 時會由 Nest 印出「後端已就緒」與埠號；前端在 Next 就緒後會再印出一段「開發環境：前後端埠號」彙整）
   - **分開兩個終端機**：後端 `npm run dev:server`（預設 `http://localhost:3004`，namespace `/planning-poker`）、前端 `npm run dev:web`（預設 `http://localhost:3003`）
4. 瀏覽器開啟前端網址；由 Host 建立房間、分享房間代碼給其他人加入。
5. **身分與重連**：前端以 `sessionStorage` 保存每瀏覽器工作階段的 `clientId`（UUID）與房間代碼；重新整理後會自動嘗試回到同一房。清除網站資料或換瀏覽器需重新加入。

### 跨網域／不同埠

- 前端開發固定使用 **`next dev -p 3003`**（見 `apps/web/scripts/start-next-dev.cjs`）；若要改埠請一併修改該腳本與 `NEXT_PUBLIC_WS_ORIGIN`／`WEB_ORIGIN`。
- 後端埠由環境變數 **`PORT`** 控制（預設 3004 `apps/server/src/main.ts` 一致）；彙整區塊會用同一 `PORT` 顯示後端網址。
- 後端 `WEB_ORIGIN` 需與前端來源一致（見 `apps/server/.env.example`），以便 CORS 與 Socket.IO 連線。
- 前端 WebSocket 連線來源：
  - **優先**使用 `NEXT_PUBLIC_WS_ORIGIN`（必須指向 Nest 的基底 URL，含埠號、無尾階 path；例如 `http://192.168.1.50:3004`）。
  - 若未設定，前端會以「目前頁面的 hostname + `:3004`」作為預設（避免遠端使用時被 `localhost` 綁死）。

### 驗證多房間隔離

開啟兩組瀏覽器視窗（或一般 + 無痕），各自建立不同房間並投票：倒數、亮牌與結果應互不影響。

### 測試

```bash
npm run test:server
```

### 建置

```bash
npm run build
```

### Makefile（可選）

本專案提供根目錄 `Makefile` 方便快速執行常用指令（本質上是包裝 npm scripts）。

```bash
make help
```

常用目標：

- `make dev`：前後端同時開發（等同 `npm run dev`）
- `make dev-server` / `make dev-web`：只跑後端 / 只跑前端
- `make test` / `make test-watch` / `make test-cov` / `make test-e2e`：後端測試
- `make lint`：前後端 lint
- `make build`：建置 server + web

Windows 注意：

- 需要可用的 `make`（例如 Git Bash / WSL / MSYS2 / GnuWin32）。
- `make clean` 會呼叫 `rm -rf`，建議在 Git Bash / WSL 下使用。

## Release Notes

### 1.0.6

- **Planning Poker 估算公式**：Round 1/2 成功平均與 Round 3 收斂時，亮牌、項目完結與估算歷史皆顯示 `calculationFormula`（Fibonacci 區間或移除 min/max 後之算式）。
- **平均精度**：成功與收斂之平均 **四捨五入至個位數**（整數），與公式結尾一致。
- **OpenSpec**：封存 `planning-poker-calculation-formula` 並同步 `openspec/specs/planning-poker/spec.md`。

### 1.0.5

- **Planning Poker 估算歷史**：待估項目完結後於房內面板回看本機歷史（localStorage），含摘要與投票明細。
- **修正**：Host 與參與者皆能穩定看到歷史更新。

### 1.0.4

- **Docker Compose（本機 / 正式）**：`apps/server` / `apps/web` 容器不再在 Dockerfile 內硬編 `PORT`，而是完全由環境變數與 `docker compose` 的 `environment` / `ports` 控制；`docker-compose.yml` 用 9003/9004，`docker-compose.local.yml` 用 3003/3004（主機埠可自由調整）。

### 1.0.3

- **WebSocket / 區網**：前端未設 `NEXT_PUBLIC_WS_ORIGIN` 時，依頁面埠推斷後端：**3003→3004**、**9003→9004**；可選 `NEXT_PUBLIC_WS_PORT` 覆寫。
- **後端**：預設 **`HOST=0.0.0.0`** 監聽，同網段可用主機 IP 連線（可用 `HOST` 覆寫）。
- **Dockerfile**：移除 `# syntax=docker/dockerfile:1`，避免本機錯誤的 Docker Hub 登入導致建置 401。

### 1.0.2

- **CI / Docker Hub**：於 GitHub **Release（published）** 時由 Actions 自動建置並推送映像（見 `.github/workflows/docker-publish-on-release.yml`）；需在 repo **Actions secrets** 設定 `DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN`。映像：`<username>/agiletools-server`、`<username>/agiletools-web`；標籤為 Release 的 tag 名稱，且非 prerelease 時另推 `latest`。
- **Docker Compose**：預設映像前綴仍為 GHCR `ghcr.io/domain5566/...`（可改為你的 Docker Hub 名稱）；本機亦可使用 `scripts/docker-release.ps1` 手動推 GHCR。
- 本機 `make dev` 仍為 **3003 / 3004**；`docker compose` 對外仍為 **9003 / 9004**。

### 1.0.1

- WeAgile 品牌 Logo 與配色、本機開發埠改為 3003/3004、OpenSpec `logo-theme-refresh` 與 `web-branding-theme` 規格。

### 1.0.0

- Planning Poker 重連／房間生命週期、首版 GitHub Release。
