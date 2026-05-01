import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("product_units")
      .update({ status: "disabled" })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);

    return Response.json({ unit: data });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}
