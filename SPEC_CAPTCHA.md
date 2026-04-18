# PureAirWeb · Captcha 验证系统规格（免费开源方案）

## 1. 背景与目标

在 PureAirWeb 中集成真实电商级验证码防护，用于演示 OpenClaw + CDP 做 UAT Automation 时需要突破的真实网站反爬机制。

**核心演示场景**：UAT Automation Agent 需要能识别并处理两种常见验证码（滑块、数学），以及通过 Admin 界面实时控制验证码开关。

---

## 2. 验证码服务选型（免费开源）

| 类型 | 服务 | 说明 |
|------|------|------|
| 滑块拼图 | **slider-captcha-js** | https://www.npmjs.com/package/slider-captcha-js 开源免费，支持 React/TS |
| 数学验证 | **自研 `MathCaptcha`** | 随机数学加减乘题（无额外 npm 依赖，兼容 React 18） |

**接入方式**：通过 npm 安装，无外部 API 依赖，完全自托管。

---

## 3. 环境变量

```env
# Captcha 系统总开关（Admin 保护）
CAPTCHA_ADMIN_TOKEN=your-admin-token
NEXT_PUBLIC_CAPTCHA_ENABLED=true
NEXT_PUBLIC_CAPTCHA_LOGIN_ENABLED=true
NEXT_PUBLIC_CAPTCHA_ORDER_ENABLED=true
CAPTCHA_RANDOM_TRIGGER_RATE=0.2
CAPTCHA_COOLDOWN_MINUTES=5
```

---

## 4. 验证码触发规则

| 触发场景 | 验证码类型 | 触发条件 |
|---------|-----------|---------|
| `/login` 提交 | Math Captcha（数学） | 始终触发（可关闭） |
| `/order/new` 提交 | Slider Captcha（滑块） | 始终触发（可关闭） |
| `/products/[id]` 页面加载 | Math Captcha | 随机 20% 概率（可配置） |
| `/cart` 操作后 | Math Captcha | 随机 20% 概率（可配置） |

### Cooldown 机制
- 验证通过后，同一浏览器标记 `captcha_passed`（sessionStorage）
- Cooldown 时间可配置（默认 5 分钟），期间不再触发随机验证码

---

## 5. 系统开关（Admin + Demo Toggle）

### 5.1 Admin 管理界面

**路由**：`/admin/captcha`
**保护**：需要 `?token=<CAPTCHA_ADMIN_TOKEN>` 参数

功能：
- 查看当前验证码开关状态（总开关 + 各类型开关）
- 实时修改：`enabled`、`login_captcha`、`order_captcha`、`random_trigger_rate`、`cooldown_minutes`

**API**：
```
GET  /api/admin/captcha?token=xxx
     → { enabled, login_captcha, order_captcha, random_trigger_rate, cooldown_minutes }

POST /api/admin/captcha?token=xxx
     Body: { enabled?, login_captcha?, order_captcha?, random_trigger_rate?, cooldown_minutes? }
     → 更新配置
```

### 5.2 Demo 演示开关页面

**路由**：`/demo/captcha-toggle`
功能：
- 独立页面，供演示者实时切换验证码开关
- 叠加在 Admin 配置之上，演示时快速开关
- 卡片式 UI，显示当前状态，一键切换

---

## 6. 前端集成

### 6.1 登录页 `/login`

- 表单提交前触发 Math Captcha 验证（随机加减乘除）
- 验证通过后提交表单

### 6.2 下单页 `/order/new`

- 表单提交前触发 Slider Captcha 滑块验证
- 验证通过后提交表单

### 6.3 产品页 `/products/[id]` 和 `/cart`

- 页面加载后随机概率触发 Math Captcha
- 不阻塞用户操作，异步弹出
- 验证通过后设置 sessionStorage cooldown

---

## 7. 验证码组件清单

```
src/
  components/
    captcha/
      math-captcha.tsx      # 数学验证码组件（随机加减乘除）
      slider-captcha.tsx    # 滑块拼图组件（基于 slider-captcha-js）
      captcha-gate.tsx      # 随机触发 gate（cooldown 检查）
  app/
    login/page.tsx           # 集成 Math Captcha
    order/new/page.tsx       # 集成 Slider Captcha
    products/[id]/page.tsx   # 随机触发 Math Captcha
    cart/page.tsx            # 随机触发 Math Captcha
    admin/captcha/
      page.tsx               # Admin 管理界面
    demo/
      captcha-toggle/
        page.tsx             # Demo 演示开关
    api/
      captcha/
        verify/route.ts      # 统一验证 API
      admin/
        captcha/route.ts     # Admin 配置 API
```

---

## 8. 实现顺序

1. **安装依赖**：`npm install slider-captcha-js`
2. **环境变量**：更新 `.env.example`
3. **验证码组件**：
   - `src/components/captcha/math-captcha.tsx`（数学验证）
   - `src/components/captcha/slider-captcha.tsx`（滑块拼图）
   - `src/components/captcha/captcha-gate.tsx`（随机触发 + cooldown）
4. **Admin 开关**：`/admin/captcha` 管理界面 + `/api/admin/captcha` API
5. **登录验证码**：Math Captcha 接入 `/login`
6. **下单验证码**：Slider Captcha 接入 `/order/new`
7. **随机验证码**：在 `/products/[id]` 和 `/cart` 集成随机触发逻辑
8. **Demo 开关页面**：`/demo/captcha-toggle`
9. **Build 验证**：`npm run build` 通过

---

## 9. 验收标准

- [ ] Admin 界面可以查看和修改验证码开关（受 token 保护）
- [ ] Demo 页面可以一键切换开关状态
- [ ] 登录页提交前强制触发 Math Captcha（可关闭）
- [ ] 下单页提交前强制触发 Slider Captcha（可关闭）
- [ ] 产品页和购物车随机触发 Math Captcha（概率可配置）
- [ ] 验证码通过后 5 分钟内不重复触发（cooldown）
- [ ] `npm run build` 通过
- [ ] 无外部 API 依赖，完全自托管
