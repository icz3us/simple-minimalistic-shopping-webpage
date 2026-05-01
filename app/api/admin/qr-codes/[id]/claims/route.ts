import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await verifyAdmin(request);
    const { id } = await context.params;

    if (!id) {
      return jsonError("QR code id is required.", 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("user_collections")
      .select("id, user_id, claimed_at, profiles(email, full_name)")
      .eq("qr_code_id", id)
      .order("claimed_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return Response.json({ claimants: data ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
