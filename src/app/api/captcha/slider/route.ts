import crypto from "crypto";
import fs from "fs";
import path from "path";

import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { NextResponse } from "next/server";

import { createSliderV2Token } from "@/lib/captcha-slider-v2-token";

export const dynamic = "force-dynamic";

const BG_W = 480;
const BG_H = 320;

interface HoleInfo {
  shape: "jigsaw";
  x: number;
  y: number;
  width: number;
  height: number;
}

type TabDirection = -1 | 1;

interface JigsawShape {
  width: number;
  height: number;
  base: number;
  knobRadius: number;
  tabs: {
    top: TabDirection;
    right: TabDirection;
    bottom: TabDirection;
    left: TabDirection;
  };
}

function randomTabDirection(): TabDirection {
  return crypto.randomInt(0, 2) === 0 ? -1 : 1;
}

function makeJigsawShape(): JigsawShape {
  const base = 52;
  const knobRadius = 10;
  return {
    width: base + knobRadius * 2,
    height: base + knobRadius * 2,
    base,
    knobRadius,
    tabs: {
      top: randomTabDirection(),
      right: randomTabDirection(),
      bottom: randomTabDirection(),
      left: randomTabDirection(),
    },
  };
}

type LoadedImage = Awaited<ReturnType<typeof loadImage>>;

function drawBgCover(ctx: SKRSContext2D, img: LoadedImage, cw: number, ch: number) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawJigsawPath(
  ctx: SKRSContext2D,
  shape: JigsawShape,
  holeX: number,
  holeY: number,
): void {
  const x0 = holeX + shape.knobRadius;
  const y0 = holeY + shape.knobRadius;
  const x1 = x0 + shape.base;
  const y1 = y0 + shape.base;
  const midX = x0 + shape.base / 2;
  const midY = y0 + shape.base / 2;
  const r = shape.knobRadius;

  ctx.beginPath();
  ctx.moveTo(x0, y0);

  // Top edge
  ctx.lineTo(midX - r, y0);
  ctx.arc(midX, y0, r, Math.PI, 0, shape.tabs.top === 1);
  ctx.lineTo(x1, y0);

  // Right edge
  ctx.lineTo(x1, midY - r);
  ctx.arc(x1, midY, r, -Math.PI / 2, Math.PI / 2, shape.tabs.right === -1);
  ctx.lineTo(x1, y1);

  // Bottom edge
  ctx.lineTo(midX + r, y1);
  ctx.arc(midX, y1, r, 0, Math.PI, shape.tabs.bottom === -1);
  ctx.lineTo(x0, y1);

  // Left edge
  ctx.lineTo(x0, midY + r);
  ctx.arc(x0, midY, r, Math.PI / 2, Math.PI * 1.5, shape.tabs.left === -1);
  ctx.closePath();
}

export async function GET() {
  try {
    const bgDir = path.join(process.cwd(), "public", "captcha", "bg");
    const files = fs.readdirSync(bgDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: "No background images in public/captcha/bg" }, { status: 500 });
    }
    const bgFile = files[crypto.randomInt(0, files.length)]!;
    const bgPath = path.join(bgDir, bgFile);
    const buf = fs.readFileSync(bgPath);
    const img = await loadImage(buf);

    const distShape = makeJigsawShape();
    const matchShape = makeJigsawShape();
    const pieceW = Math.max(distShape.width, matchShape.width);
    const pieceH = Math.max(distShape.height, matchShape.height);

    const margin = 24;
    const x0 = margin + crypto.randomInt(0, Math.max(1, BG_W - pieceW - margin * 2));
    const y0 = margin + crypto.randomInt(0, Math.max(1, BG_H - pieceH - margin * 2));
    const x1 = Math.min(BG_W - pieceW - margin, x0 + 120 + crypto.randomInt(0, 60));
    const y1 = margin + crypto.randomInt(0, Math.max(1, BG_H - pieceH - margin * 2));

    const matchHoleIndex = crypto.randomInt(0, 2) as 0 | 1;

    const holeMatch: HoleInfo = {
      shape: "jigsaw",
      x: matchHoleIndex === 0 ? x0 : x1,
      y: matchHoleIndex === 0 ? y0 : y1,
      width: matchShape.width,
      height: matchShape.height,
    };
    const holeDist: HoleInfo = {
      shape: "jigsaw",
      x: matchHoleIndex === 0 ? x1 : x0,
      y: matchHoleIndex === 0 ? y1 : y0,
      width: distShape.width,
      height: distShape.height,
    };
    const holeData: [HoleInfo, HoleInfo] = matchHoleIndex === 0 ? [holeMatch, holeDist] : [holeDist, holeMatch];
    const shapeData: [JigsawShape, JigsawShape] = matchHoleIndex === 0
      ? [matchShape, distShape]
      : [distShape, matchShape];

    const matchHole = holeData[matchHoleIndex]!;
    const sliderW = matchHole.width;
    const sliderH = matchHole.height;

    const tx = matchHole.x + matchHole.width / 2;
    const ty = matchHole.y + matchHole.height / 2;

    const nonce = crypto.randomUUID();
    const token = createSliderV2Token({
      typ: "slider_v2",
      v: 2,
      tx,
      ty,
      pieceCenterOffsetX: 0,
      pieceCenterOffsetY: 0,
      bgW: BG_W,
      bgH: BG_H,
      sliderW,
      sliderH,
      nonce,
    });

    const canvas = createCanvas(BG_W, BG_H);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    drawBgCover(ctx, img, BG_W, BG_H);

    for (let i = 0; i < holeData.length; i++) {
      const hole = holeData[i]!;
      const shape = shapeData[i]!;
      drawJigsawPath(ctx, shape, hole.x, hole.y);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const bgPng = await canvas.encode("png");
    const bgImage = `data:image/png;base64,${bgPng.toString("base64")}`;

    const tempCanvas = createCanvas(BG_W, BG_H);
    const tctx = tempCanvas.getContext("2d");
    if (!tctx) throw new Error("canvas 2d context unavailable");
    drawBgCover(tctx, img, BG_W, BG_H);

    // 拼块：先把缺口 bbox 对应矩形从完整底图拷到小画布，再按拼图路径做 clip。
    const pieceCanvas2 = createCanvas(sliderW, sliderH);
    const pctx2 = pieceCanvas2.getContext("2d");
    if (!pctx2) throw new Error("canvas 2d context unavailable");
    pctx2.save();
    drawJigsawPath(pctx2, matchShape, 0, 0);
    pctx2.clip();
    pctx2.drawImage(tempCanvas, matchHole.x, matchHole.y, sliderW, sliderH, 0, 0, sliderW, sliderH);
    pctx2.restore();
    drawJigsawPath(pctx2, matchShape, 0, 0);
    pctx2.strokeStyle = "rgba(255,255,255,0.95)";
    pctx2.lineWidth = 2;
    pctx2.stroke();

    const piecePng = await pieceCanvas2.encode("png");
    const sliderImage = `data:image/png;base64,${piecePng.toString("base64")}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        bgImage,
        sliderImage,
        holeData,
        matchHoleIndex,
        sliderWidth: sliderW,
        sliderHeight: sliderH,
        bgWidth: BG_W,
        bgHeight: BG_H,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
    });
  } catch (err) {
    console.error("[captcha/slider]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
