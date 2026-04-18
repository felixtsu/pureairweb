# PureAirWeb 订单功能需求

## 1. 概述

为 PureAir Web 增加消费者下单页面 + 用户登录系统（Supabase Auth 用户名密码登录），数据写入 Supabase 数据库。

## 2. 现有数据模型

```sql
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,           -- 对应 auth.users.id
  product_name text not null,
  model text not null,
  purchase_date date not null,
  warranty_expires_at date not null
);
```

## 3. Auth / Session 方案（Supabase Auth）

- 使用 `@supabase/ssr` 处理 server-side session
- Session cookie 由 Supabase SSR 自动管理
- 登录方式：用户名（邮箱） + 密码，由 Supabase Auth 管理
- Middleware 保护 `/order/new` 和 `/orders`，未登录重定向到 `/login?redirect=<当前路径>`

## 4. 功能需求

### 4.1 登录页 `/login`

- 用户名（邮箱） + 密码登录表单
- 调用 `supabase.auth.signInWithPassword({ email, password })`
- 登录成功 → 设置 session → 跳转 `redirect` 参数页面或首页

### 4.2 下单页 `/order/new?product=<id>`

- 需登录，未登录 → 重定向 `/login?redirect=/order/new?product=<id>`
- 产品下拉框，已选产品高亮
- 安装地址（选填）、备注（选填）
- 提交 → POST `/api/orders` → 写入 `purchase_orders`
- 购买日=今天，保修日=今天+1年
- 成功 → 显示订单号 + 跳转「我的订单」按钮

### 4.3 我的订单 `/orders`

- 需登录，未登录 → 重定向
- 读取当前登录用户，自动查询该用户所有订单
- 按日期倒序展示：产品名、型号、购买日、保修状态
- 保修状态标签：已过期（<0天）/ 即将到期（≤90天）/ 有效（>90天）

### 4.4 导航栏 SiteHeader

- 未登录：显示「登录」按钮（指向 `/login`）
- 已登录：显示用户邮箱 + 「退出登录」+ 「我的订单」
- 始终显示：产品列表、AI 智能顾问

### 4.5 产品详情页 `/products/[id]`

- footer 区域：「立即订购」按钮
- 已登录 → 跳转 `/order/new?product=<id>`
- 未登录 → 跳转 `/login?redirect=/order/new?product=<id>`
- 保留「与 AI 顾问咨询」按钮

## 5. API 设计

| 方法 | 路径 | 说明 | 授权 |
|------|------|------|------|
| POST | `/api/auth/login` | body: `{ email, password }` | 公开 |
| POST | `/api/auth/logout` | 清除 session | 公开 |
| GET | `/api/auth/me` | 返回 `{ user }` 或 `{ user: null }` | 公开 |
| GET | `/api/orders` | 返回当前用户订单列表 | 需登录 |
| POST | `/api/orders` | body: `{ productName, model }` | 需登录 |

**POST /api/auth/login**
- 请求体：`{ email, password }`
- 成功：`{ success: true, user: { id, email } }`
- 失败：`{ error: string }` 400

**GET /api/orders**（需登录）
- 成功：`{ orders: [{ id, product, model, purchaseDate, warrantyExpiresAt }] }`
- 未登录：401

**POST /api/orders**（需登录）
- 成功：`{ success: true, order: { id, product, model, purchaseDate, warrantyExpiresAt } }`
- 未登录：401

## 6. 验收标准

1. `npm run build` 通过，无报错
2. 未登录访问 `/order/new` → 跳转 `/login?redirect=/order/new`
3. `/login` 输入用户名（邮箱） + 密码 → 登录成功，跳转回首页
4. 登录后 Header 显示用户邮箱 + 「退出登录」
5. `/order/new?product=pureair-home` → 产品下拉框默认选中 PureAir Home
6. 下单提交 → `purchase_orders` 有记录 → `/orders` 能查到
7. 保修状态计算：<0天=已过期，≤90天=即将到期，>90天=有效
8. 退出登录 → `/orders` 跳转登录页
9. 产品详情页「立即订购」→ 未登录先跳转登录页

## 7. 技术约束

- Next.js App Router
- 使用 `@supabase/ssr` 包做 Supabase Auth session 管理
- Client Components 处理登录 flow
- Tailwind CSS，现有风格保持一致
- 不依赖 Coze/AI 功能
- 直接使用 `auth.users`，无需新建用户表
