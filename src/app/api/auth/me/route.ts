import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("[me]", err);
    return NextResponse.json({ user: null });
  }
}
