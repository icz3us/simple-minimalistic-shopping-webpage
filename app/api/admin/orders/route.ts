import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const supabase = getSupabaseAdmin();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, profiles!orders_user_id_fkey(email, full_name)")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);

    return Response.json({ orders: orders ?? [] });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}
