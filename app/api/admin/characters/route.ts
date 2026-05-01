import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("techbits_characters")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return Response.json({ characters: data ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const quantity = Math.min(Math.max(Number(body.quantity ?? 1), 1), 500);

    const { data, error } = await supabase
      .from("techbits_characters")
      .insert({
        name: String(body.name ?? "").trim(),
        description: String(body.description ?? "").trim(),
        image_url: body.image_url ? String(body.image_url).trim() : null,
        classification: body.classification,
        price: Number(body.price ?? 0),
        total_quantity: quantity,
        claimed_quantity: 0,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);

    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("character_id", data.id)
      .single();

    if (qrError) return jsonError(qrError.message, 400);
    return Response.json({ character: data, qrCode }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
