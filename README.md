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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL（Demo 訂單/售後 API 使用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（僅 server 端使用） |
| `AGENT_API_KEY` | Agent 呼叫 `/api/demo/*` 時的 `X-API-Key` |

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

## Demo 多用戶 Memory

- 聊天頁右上角可切換 `Demo User A/B`。
- 每次請求都會把 `userId` 傳入 Coze 的 `user_id`，因此可展示不同用戶有不同 memory。
- 切換 user 時會重置 `conversationId`，避免不同身份混用同一會話。

## Demo Agent API

這兩個 API 供 Agent 工具調用，皆需帶 Header：`X-API-Key: <AGENT_API_KEY>`。

### 1) 查詢歷史訂單

- `GET /api/demo/orders?userId=demo-user-a`
- 回傳欄位包含：產品、型號、購買日期、保修到期日

```bash
curl -X GET "http://localhost:3000/api/demo/orders?userId=demo-user-a" \
  -H "X-API-Key: your_agent_api_key"
```

### 2) place_service_request

- `POST /api/demo/place-service-request`
- Body:
  - `userId`
  - `requestType` (`repair` 或 `cleaning`)
  - `productName`
  - `model`
  - `issueDescription`

```bash
curl -X POST "http://localhost:3000/api/demo/place-service-request" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_agent_api_key" \
  -d '{
    "userId": "demo-user-a",
    "requestType": "repair",
    "productName": "PureAir Pro",
    "model": "PA-PRO-2024",
    "issueDescription": "機器異常噪音，需要安排上門檢修"
  }'
```

## Coze Chat API 直接調用（Demo 用戶）

調用 Coze API 時需同時傳 `user_id` 與 `custom_variables.userId`，且必須為 `demo-user-a` 或 `demo-user-b` 才能查到對應訂單/售後數據：

```bash
curl -X POST 'https://api.coze.com/v3/chat' \
  -H "Authorization: Bearer <YOUR_PERSONAL_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "<YOUR_BOT_ID>",
    "user_id": "demo-user-b",
    "stream": true,
    "additional_messages": [
      {
        "content": "我的 Home 好像不太正常工作，能安排人上門看看嗎？",
        "content_type": "text",
        "role": "user",
        "type": "question"
      }
    ],
    "custom_variables": {
      "userId": "demo-user-b"
    }
  }'
```

## Coze Tool 配置建議

在 Coze Agent 新增兩個工具：

- `get_user_orders`
  - method: `GET`
  - url: `/api/demo/orders?userId={{user_id}}` 或 `?userId={{custom_variables.userId}}`
  - headers: `X-API-Key: <AGENT_API_KEY>`
- `place_service_request`
  - method: `POST`
  - url: `/api/demo/place-service-request`
  - headers: `X-API-Key: <AGENT_API_KEY>`
  - body: `userId`、`requestType`、`productName`、`model`、`issueDescription`（`userId` 可用 `{{user_id}}` 或 `{{custom_variables.userId}}`）

## Supabase 初始化（Demo）

- 在 Supabase SQL Editor 執行：`supabase/demo-schema.sql`
- 該檔會建立 `purchase_orders`、`service_requests` 兩張表，並插入 `demo-user-a/b` 測試訂單資料。
