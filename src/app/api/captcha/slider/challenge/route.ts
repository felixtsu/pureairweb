import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns image URLs for `slider-captcha-js` `request()` when using server integration.
 * Images are from picsum (same class of source as the library default).
 */
export async function GET(request: NextRequest) {
  const w = Math.min(800, Math.max(200, Number(request.nextUrl.searchParams.get("w")) || 320));
  const h = Math.min(600, Math.max(120, Number(request.nextUrl.searchParams.get("h")) || 160));
  const r1 = crypto.randomUUID();
  const r2 = crypto.randomUUID();
  const bgUrl = `https://picsum.photos/${Math.floor(w)}/${Math.floor(h)}?random=${r1}`;
  const puzzleUrl = `https://picsum.photos/${Math.floor(w)}/${Math.floor(h)}?random=${r2}`;
  return NextResponse.json({ bgUrl, puzzleUrl });
}
