import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("purchase_orders")
      .select("id, product_name, model, purchase_date, warranty_expires_at")
      .eq("user_id", user.id)
      .order("purchase_date", { ascending: false });

    if (error) {
      console.error("[orders GET]", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const orders = (data || []).map((o) => ({
      id: o.id,
      product: o.product_name,
      model: o.model,
      purchaseDate: o.purchase_date,
      warrantyExpiresAt: o.warranty_expires_at,
    }));

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[orders GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productName, model } = await request.json();

    if (!productName || !model) {
      return NextResponse.json({ error: "productName and model are required" }, { status: 400 });
    }

    const purchaseDate = new Date();
    const warrantyExpiresAt = new Date(purchaseDate);
    warrantyExpiresAt.setFullYear(warrantyExpiresAt.getFullYear() + 1);

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        user_id: user.id,
        product_name: productName,
        model,
        purchase_date: purchaseDate.toISOString().split("T")[0],
        warranty_expires_at: warrantyExpiresAt.toISOString().split("T")[0],
      })
      .select("id, product_name, model, purchase_date, warranty_expires_at")
      .single();

    if (error) {
      console.error("[orders POST]", error);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const order = {
      id: data.id,
      product: data.product_name,
      model: data.model,
      purchaseDate: data.purchase_date,
      warrantyExpiresAt: data.warranty_expires_at,
    };

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("[orders POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
