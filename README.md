# PureAir 產品網站

空氣淨化器產品展示網站，含產品列表、產品詳情與 AI 智能銷售顧問（由 Coze.com Agent 透過 API 提供）。

## 技術棧

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## 功能

- **產品展示**：首頁列出三款型號（Home / Pro / Max），點擊可進入詳情頁。
- **AI 智能顧問**：`/chat` 頁面與 Coze 後台部署的 Bot 對話，需配置環境變量後使用。

## 環境變量

複製 `.env.example` 為 `.env.local` 並填寫：

| 變量 | 說明 |
|------|------|
| `COZE_BOT_ID` | Coze 後台該 Bot 的 ID（發布為 API 後可見） |
| `COZE_API_KEY` | Coze Personal Access Token（API 授權裡建立） |

中國區 Coze 若需使用 `api.coze.cn`，可在 `src/app/api/coze/chat/route.ts` 中將 `COZE_API_BASE` 改為從環境變量讀取並設為 `https://api.coze.cn`。

## 開發

```bash
npm install
npm run dev
```

瀏覽 [http://localhost:3000](http://localhost:3000)。

## 產品型號摘要

| 型號 | 適用面積 | 價格 |
|------|----------|------|
| PureAir Home（家用版） | 30–50 ㎡ | HKD 1,299 |
| PureAir Pro（專業版） | 60–100 ㎡ | HKD 3,599 |
| PureAir Max（商用旗艦） | 150–300 ㎡ | HKD 8,800 |

詳細規格見首頁與各產品詳情頁。
