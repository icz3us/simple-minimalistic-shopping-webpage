import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyRequestUser } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequestUser(request);
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("user_collections")
      .select("*, techbits_characters(*)")
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return Response.json({ collection: data ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
