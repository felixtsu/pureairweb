import { NextResponse, type NextRequest } from "next/server";
import { createEdgeSupabaseClient } from "@/lib/auth-edge";

const PROTECTED_PATHS = ["/order/new", "/orders"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const supabase = createEdgeSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/order/new/:path*", "/orders/:path*"],
};
