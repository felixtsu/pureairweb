import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[logout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
