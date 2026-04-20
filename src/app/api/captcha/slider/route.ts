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
  shape: "polygon";
  x: number;
  y: number;
  polygonPoints: number[];
  width: number;
  height: number;
}

/** 4–6 顶点不规则多边形（相对 hole 左上角 0,0），含轻微凸起模拟拼图块 */
function makeDistractorPolygon(): { poly: number[]; width: number; height: number } {
  const raw = [
    [0, 0],
    [56, 0],
    [62, 22],
    [58, 42],
    [28, 48],
    [0, 36],
  ];
  return normalizePolygon(raw);
}

function makeMatchPolygon(): { poly: number[]; width: number; height: number } {
  const raw = [
    [0, 10],
    [18, 0],
    [56, 4],
    [60, 38],
    [32, 50],
    [0, 44],
  ];
  return normalizePolygon(raw);
}

function normalizePolygon(verts: number[][]): { poly: number[]; width: number; height: number } {
  const xs = verts.map((v) => v[0]);
  const ys = verts.map((v) => v[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const poly: number[] = [];
  for (const [x, y] of verts) {
    poly.push(x - minX, y - minY);
  }
  return { poly, width: maxX - minX, height: maxY - minY };
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

function fillPolygonPath(
  ctx: SKRSContext2D,
  poly: number[],
  holeX: number,
  holeY: number,
): void {
  ctx.beginPath();
  const n = poly.length / 2;
  ctx.moveTo(holeX + poly[0]!, holeY + poly[1]!);
  for (let i = 1; i < n; i++) {
    ctx.lineTo(holeX + poly[i * 2]!, holeY + poly[i * 2 + 1]!);
  }
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

    const dist = makeDistractorPolygon();
    const mat = makeMatchPolygon();

    const margin = 24;
    const x0 = margin + crypto.randomInt(0, Math.max(1, BG_W - Math.max(dist.width, mat.width) - margin * 2));
    const y0 = margin + crypto.randomInt(0, Math.max(1, BG_H - Math.max(dist.height, mat.height) - margin * 2));
    const x1 = Math.min(BG_W - Math.max(dist.width, mat.width) - margin, x0 + 120 + crypto.randomInt(0, 60));
    const y1 = margin + crypto.randomInt(0, Math.max(1, BG_H - Math.max(dist.height, mat.height) - margin * 2));

    const matchHoleIndex = crypto.randomInt(0, 2) as 0 | 1;

    const holeMatch: HoleInfo = {
      shape: "polygon",
      x: matchHoleIndex === 0 ? x0 : x1,
      y: matchHoleIndex === 0 ? y0 : y1,
      polygonPoints: mat.poly,
      width: mat.width,
      height: mat.height,
    };
    const holeDist: HoleInfo = {
      shape: "polygon",
      x: matchHoleIndex === 0 ? x1 : x0,
      y: matchHoleIndex === 0 ? y1 : y0,
      polygonPoints: dist.poly,
      width: dist.width,
      height: dist.height,
    };
    const holeData: [HoleInfo, HoleInfo] = matchHoleIndex === 0 ? [holeMatch, holeDist] : [holeDist, holeMatch];

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

    ctx.globalCompositeOperation = "destination-out";
    fillPolygonPath(ctx, holeData[0]!.polygonPoints, holeData[0]!.x, holeData[0]!.y);
    ctx.fill();
    fillPolygonPath(ctx, holeData[1]!.polygonPoints, holeData[1]!.x, holeData[1]!.y);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    const bgPng = await canvas.encode("png");
    const bgImage = `data:image/png;base64,${bgPng.toString("base64")}`;

    const tempCanvas = createCanvas(BG_W, BG_H);
    const tctx = tempCanvas.getContext("2d");
    if (!tctx) throw new Error("canvas 2d context unavailable");
    drawBgCover(tctx, img, BG_W, BG_H);

    const pieceCanvas2 = createCanvas(sliderW, sliderH);
    const pctx2 = pieceCanvas2.getContext("2d");
    if (!pctx2) throw new Error("canvas 2d context unavailable");
    pctx2.save();
    pctx2.translate(-matchHole.x, -matchHole.y);
    pctx2.beginPath();
    const mp2 = matchHole.polygonPoints;
    pctx2.moveTo(mp2[0]!, mp2[1]!);
    for (let i = 1; i < mp2.length / 2; i++) {
      pctx2.lineTo(mp2[i * 2]!, mp2[i * 2 + 1]!);
    }
    pctx2.closePath();
    pctx2.clip();
    pctx2.drawImage(tempCanvas, 0, 0);
    pctx2.restore();

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
