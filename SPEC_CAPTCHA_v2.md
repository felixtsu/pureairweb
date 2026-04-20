# PureAirWeb · Captcha 验证系统规格 v2（拼图滑块 + 轨迹分析）

> 升级目标：从简单滑块 → 电商级双块拼图滑块 + 轨迹行为分析

---

## 1. 核心变更（相比 v1）

| 项目 | v1（简单滑块） | v2（双块拼图） |
|------|--------------|--------------|
| 形态 | 单缺口（圆形/方形） | **双缺口多边形拼图**（PDD 风格） |
| 形状 | 基础几何 | **多边形拼图块**（服务端 Canvas 生成） |
| 干扰 | 无 | 两个缺口，slider 只匹配其中一个 |
| 轨迹 | 无 | **全轨迹记录 + 行为分析** |
| 图片 | 外部 npm 包 | **内置图库 + 自建 Canvas 挖块** |

---

## 2. 验证码形态

### 双块拼图滑块（Type B — 默认必选）

```
┌──────────────────────────────────────────┐
│  ████████      ████████████████         │
│  ████████ ◯    ████████████████ 缺口A    │
│         ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔              │
│  ████████████████      ████████         │
│  ████████████████ ☆    ████████ 缺口B   │
│           🧩 ← 滑块（星形，与缺口B匹配）  │
│          ▁▁▁▁▔                           │
│  ←────────── 用户拖动方向 ──────────────→ │
└──────────────────────────────────────────┘
```

**规则**：
- 背景图上有 **两个缺口**（缺口A=圆形，缺口B=多边形）
- slider 的形状与**其中一个**缺口完全一致（随机指定匹配哪个）
- 用户需将 slider 拖到**正确缺口**位置（另一个是干扰项）

---

## 3. 内置图片库

### 3.1 图片来源

从 `https://randompic.imagepp.com/list` 下载 10 张风景/建筑图片，保存到：
```
public/captcha/bg/
  bg_01.jpg
  bg_02.jpg
  ...
  bg_10.jpg
```

**要求**：1920×1080 或近似比例，JPEG/PNG

### 3.2 备选图源

使用 `https://picsum.photos/seed/{seed}/1920/1080` 作为备用。

---

## 4. 服务端 Canvas 挖块生成

### 4.1 生成流程

```
GET /api/captcha/slider
  → 服务端随机选一张背景图
  → Canvas 绘制：原图 + 挖出两个缺口
  → 随机生成多边形滑块（与其中一个缺口的形状一致）
  → 返回 base64: bgImage(已挖块), sliderImage, metadata
```

### 4.2 多边形拼图形状

使用**多边形**（非圆形/方形），因为这个最常见且最难用模板匹配。

```ts
interface PuzzlePiece {
  points: { x: number, y: number }[];  // 4~8 个顶点
  targetX: number;   // 缺口中心 X（相对于背景图）
  targetY: number;   // 缺口中心 Y
  width: number;
  height: number;
}
```

### 4.3 两个缺口的数据结构

```ts
interface CaptchaChallenge {
  token: string;              // 一次性 token（UUID v4）
  bgImage: string;            // base64，背景图（已挖两个缺口）
  sliderImage: string;        // base64，滑块图（多边形拼图块）
  holeData: [HoleInfo, HoleInfo];  // 两个缺口的完整信息
  matchHoleIndex: 0 | 1;     // 哪个是正确的（0=第一个，1=第二个）
  polygonPoints: number[];    // 滑块多边形顶点（扁平数组 [x1,y1,x2,y2,...]）
  sliderWidth: number;
  sliderHeight: number;
  bgWidth: number;
  bgHeight: number;
  expiresAt: number;          // 5 分钟后过期
}
```

### 4.4 Token 安全

- 每个 token 对应一次生成的挑战
- 存入内存 Map（生产环境可用 Redis）
- 验证后立即失效（一次性）
- 5 分钟自动过期

---

## 5. API 设计

### 5.1 获取验证码

```
GET /api/captcha/slider
Response 200:
{
  "success": true,
  "data": {
    "token": "uuid-v4",
    "bgImage": "data:image/jpeg;base64,...",
    "sliderImage": "data:image/png;base64,...",
    "holeData": [
      { "shape": "polygon", "x": 320, "y": 200, "polygonPoints": [0,0,80,0,80,60,0,60] },
      { "shape": "polygon", "x": 750, "y": 300, "polygonPoints": [0,0,90,0,90,70,0,70] }
    ],
    "matchHoleIndex": 1,
    "sliderWidth": 90,
    "sliderHeight": 70,
    "bgWidth": 480,
    "bgHeight": 320,
    "expiresAt": 1713600000000
  }
}
Response 500: { "success": false, "error": "生成失败" }
```

### 5.2 验证验证码

```
POST /api/captcha/verify
Content-Type: application/json
Body:
{
  "token": "uuid-v4",
  "userX": 748,
  "userY": 300,
  "trail": [
    { "x": 0,   "y": 200, "t": 0 },
    { "x": 45,  "y": 201, "t": 50 },
    ...
    { "x": 748, "y": 300, "t": 2100 }
  ]
}

Response 200:
{ "success": true, "message": "验证通过" }

Response 200:
{ "success": false, "message": "验证失败", "reason": "position_mismatch" | "trajectory_suspicious" | "token_invalid" | "token_expired" }
```

---

## 6. 轨迹分析（服务端）

### 6.1 分析维度

| 维度 | 人类特征 | 机器特征 |
|------|---------|---------|
| **速度曲线** | 加速-减速-非匀速 | 匀速或线性 |
| **轨迹抖动** | 微小抖动（±2px 手抖） | 过于平滑 |
| **停顿点** | 目标位置前有 1-2 次停顿 | 无停顿直接到位 |
| **总时长** | 800ms ~ 4000ms | < 500ms 或 > 10s |
| **轨迹曲率** | 有轻微弧度 | 完全直线 |
| **加速度** | 有加速减速过程 | 匀速 |

### 6.2 评分算法

```ts
function analyzeTrajectory(trail: TrailPoint[]): TrajectoryScore {
  const duration = trail[trail.length-1].t - trail[0].t;
  let score = 0;

  // 时长合理 +分
  if (duration >= 800 && duration <= 4000) score += 0.2;

  // 速度非匀速 +分
  if (!isUniformSpeed(speed)) score += 0.2;

  // 有停顿 +分
  if (countStops(trail) >= 1) score += 0.2;

  // 有抖动 +分
  if (hasJitter(curvature)) score += 0.2;

  // 减速接近目标 +分
  if (hasDecelerationNearEnd(speed, trail)) score += 0.2;

  return { score: 0.0~1.0, suspicious: score < 0.5 };
}
```

### 6.3 验证决策

```ts
function verify(userX, userY, challenge, trail):
  // 1. 位置验证（容差 ±10px）
  const targetHole = challenge.holeData[challenge.matchHoleIndex];
  if (distance(userX, userY, targetHole) > 10) return "position_mismatch";

  // 2. 轨迹验证
  if (analyzeTrajectory(trail).suspicious) return "trajectory_suspicious";

  return "success";
```

---

## 7. 前端组件

### 7.1 SliderCaptcha 组件

```
src/components/captcha/
  slider-captcha.tsx      # 主组件
```

**前端职责**：
- 渲染 base64 背景图（已挖缺口）
- 渲染滑块（多边形 clip-path）
- 监听 `mousedown/mousemove/mouseup`（桌面）和 `touchstart/touchmove/touchend`（移动）
- 实时记录轨迹（每帧采样 `{x, y, t}`）
- Y 轴锁定（只能水平拖动）

### 7.2 拖动约束

- **Y 轴锁定**：滑块只能在水平方向移动
- **边界限制**：滑块不能拖出容器左右边界
- **多边形形状**：通过 `clip-path: polygon(...)` 实现

---

## 8. 目录结构

```
pureairweb/
  public/
    captcha/
      bg/
        bg_01.jpg
        bg_02.jpg
        ...
        bg_10.jpg
  src/
    components/
      captcha/
        captcha-gate.tsx      # [复用]
        math-captcha.tsx      # [复用]
        slider-captcha.tsx    # [重写] 双块拼图滑块
    app/
      api/
        captcha/
          slider/
            route.ts          # [新增] 获取双块拼图验证码
          verify/
            route.ts          # [扩展] 验证滑块+轨迹
  SPEC_CAPTCHA_v2.md          # 本文档
```

---

## 9. 验收标准

- [ ] `GET /api/captcha/slider` 返回双缺口拼图数据（两个多边形缺口）
- [ ] `POST /api/captcha/verify` 正确验证位置 + 轨迹评分
- [ ] 位置偏差 ≤ 10px 时通过，> 10px 时失败
- [ ] 轨迹评分 < 0.5 时拒绝
- [ ] Token 一次性使用，验证后立即失效
- [ ] Token 5 分钟自动过期
- [ ] 滑块 Y 轴锁定，只能水平拖动
- [ ] 移动端 touch 事件支持
- [ ] 10 张内置背景图正常加载
- [ ] Admin 界面可查看/修改 slider 配置
- [ ] Demo 页面可切换 slider captcha 开关
- [ ] `npm run build` 通过
