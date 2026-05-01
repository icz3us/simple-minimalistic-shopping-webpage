import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("qr_codes")
      .select("*, techbits_characters(name, classification, total_quantity, claimed_quantity)")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return Response.json({ qrCodes: data ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const characterId = String(body.character_id ?? "");

    const supabase = getSupabaseAdmin();
    const { data: existingQr, error: existingError } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("character_id", characterId)
      .maybeSingle();

    if (existingError) return jsonError(existingError.message, 400);
    if (existingQr) return Response.json({ qrCode: existingQr }, { status: 200 });

    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        character_id: characterId,
        qr_value: `TECHBITS-${randomUUID()}`,
        status: "active",
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);
    return Response.json({ qrCode: data }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
