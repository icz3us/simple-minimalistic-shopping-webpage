import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await verifyAdmin(request);
    const { id } = await params;

    const supabase = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, profiles!orders_user_id_fkey(email, full_name)")
      .eq("id", id)
      .single();

    if (orderError) return jsonError(orderError.message, 404);

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (itemsError) return jsonError(itemsError.message, 500);

    return Response.json({ order, items: items ?? [] });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, string> = {};
    if (body.payment_status) updates.payment_status = body.payment_status;
    if (body.order_status) updates.order_status = body.order_status;

    if (Object.keys(updates).length === 0) {
      return jsonError("No valid fields to update.", 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    return Response.json({ order: data });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}
