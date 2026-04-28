# Vercel 部署操作指南（VIP Prototype）

> 目標：把本專案部署到 Vercel，拿到公開網址（`https://xxx.vercel.app`）。

## A. 本機部署（最簡單）

### 1) 前置檢查

```bash
node -v
npm -v
```

建議 Node 版本 18+

### 2) 安裝 Vercel CLI

```bash
npm i -g vercel
```

### 3) 進入專案目錄

```bash
cd /workspace/kewiVIP
```

### 4) 登入 Vercel

```bash
vercel login
```

- 選擇 Email 登入，收信後點連結授權。

### 5) 首次部署（先做 preview）

```bash
vercel
```

常見互動問題：
- `Set up and deploy ...?` -> `Y`
- `Which scope?` -> 選你的個人帳號
- `Link to existing project?` -> `N`（第一次）
- `Project name` -> 例如 `kewivip`
- `Directory` -> `./`

部署完成後會得到 Preview URL（例如 `https://kewivip-abc.vercel.app`）。

### 6) 正式環境部署（Production）

```bash
vercel --prod
```

會得到 Production URL（例如 `https://kewivip.vercel.app`）。

---

## B. CI 自動部署（GitHub Actions）

## 1) 先取得 Token 與 IDs

```bash
vercel login
vercel link
vercel env pull .env.local
```

在 `.vercel/project.json` 可看到：
- `projectId`
- `orgId`

到 Vercel Dashboard 產生 `VERCEL_TOKEN`。

## 2) 將以下 Secrets 加到 GitHub Repo

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 3) 建立 `.github/workflows/deploy-vercel.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Vercel CLI
        run: npm i -g vercel

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## C. 部署後驗收清單

部署成功後請檢查：

- 首頁：`https://你的網址/`
- 會員頁：`https://你的網址/web/index.html`
- 後台頁：`https://你的網址/web/admin.html`
- API 健康檢查：`https://你的網址/api/health`

若 `/api/health` 回傳 JSON `{"ok": true}` 代表 API 路由正常。

---

## D. 常見問題排查

1. `npm ERR! 403 Forbidden`（公司網路/registry policy）
   - 改在可連外網的本機操作。
   - 或使用公司允許的 npm registry mirror。

2. `vercel: command not found`
   - 先執行 `npm i -g vercel`。
   - 再確認 `which vercel` 有路徑。

3. API 可用但資料會重置
   - 目前 Vercel serverless 使用記憶體資料。
   - 正式版請接 DB（Supabase/Neon/PlanetScale）。

---

## E. 你只想最短流程（3 行）

```bash
npm i -g vercel
vercel login
vercel --prod
```

部署完成後，終端機會直接顯示公開 URL。
