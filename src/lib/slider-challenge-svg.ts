/**
 * 服务端生成滑块底图 / 拼块 SVG（与 slider-captcha-js 的 request() 模式配套）。
 * 库在 server 模式下将底图固定为 320×160、拼块宽度 60px；拼块圆心取 (30, slotTop+22)。
 */
const STAGE_W = 320;
const STAGE_H = 160;
const PIECE = 44;
const R = 22;
/** 拼块 SVG 内圆心 x，与库默认拼块宽度 60 对齐：滑条位移 dx 与缺口左缘 slotLeft 满足 snapDx = slotLeft + R - 30 = slotLeft - 8 */
export const SLIDER_PIECE_CENTER_X = 30;

export function computeSnapDx(slotLeft: number): number {
  return slotLeft + R - SLIDER_PIECE_CENTER_X;
}

export function buildServerSliderSvgs(slotLeft: number, slotTop: number): { bgSvg: string; pieceSvg: string } {
  const cx = slotLeft + R;
  const cy = slotTop + R;

  const bgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE_W}" height="${STAGE_H}" viewBox="0 0 ${STAGE_W} ${STAGE_H}">
  <defs>
    <linearGradient id="paBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <mask id="paHole">
      <rect width="${STAGE_W}" height="${STAGE_H}" fill="white"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="black"/>
    </mask>
  </defs>
  <rect width="${STAGE_W}" height="${STAGE_H}" fill="url(#paBg)"/>
  <rect width="${STAGE_W}" height="${STAGE_H}" fill="rgba(15,23,42,0.82)" mask="url(#paHole)"/>
</svg>`;

  const pieceSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="${STAGE_H}" viewBox="0 0 60 ${STAGE_H}">
  <defs>
    <linearGradient id="paPc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <circle cx="${SLIDER_PIECE_CENTER_X}" cy="${cy}" r="${R}" fill="url(#paPc)" stroke="#e2e8f0" stroke-width="2"/>
</svg>`;

  return { bgSvg, pieceSvg };
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * tolerance：服务端允许的 |x - snapDx| 最大偏差（像素），非「必须完全相等」。
 * 库内拇指非 44px、亚像素取整等会带来几 px 误差，默认略放宽；与库 canvas 模式默认 6 接近但略大。
 *
 * slotLeftMin：缺口左缘随机下界。过小则 snapDx（≈ slotLeft−8）接近 0，用户几乎不用拖滑条。
 */
export const SLIDER_STAGE = {
  w: STAGE_W,
  h: STAGE_H,
  piece: PIECE,
  thumb: 44,
  tolerance: 12,
  edgeMargin: 8,
  /** 缺口左缘 ≥ 此值；snapDx 至少约 (slotLeftMin − 8)px，保证需明显右移 */
  slotLeftMin: 72,
} as const;
