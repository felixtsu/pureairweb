import { NextRequest, NextResponse } from "next/server";

import { isAgentApiAuthorized } from "@/lib/agent-api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

interface PurchaseOrderRow {
  id: string;
  user_id: string;
  product_name: string;
  model: string;
  purchase_date: string;
  warranty_expires_at: string;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAgentApiAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: userId" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("id,user_id,product_name,model,purchase_date,warranty_expires_at")
      .eq("user_id", userId)
      .order("purchase_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to query purchase orders", detail: error.message },
        { status: 500 }
      );
    }

    const orders = (data ?? []).map((row: PurchaseOrderRow) => ({
      id: row.id,
      product: row.product_name,
      model: row.model,
      purchaseDate: row.purchase_date,
      warrantyExpiresAt: row.warranty_expires_at,
    }));

    return NextResponse.json({ userId, orders });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Unexpected error while querying orders", detail },
      { status: 500 }
    );
  }
}
