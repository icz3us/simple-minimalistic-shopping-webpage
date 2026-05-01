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
      .from("product_units")
      .select("*, techbits_characters(name, classification), profiles(email, full_name)")
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
    const quantity = Math.min(Math.max(Number(body.quantity ?? 1), 1), 500);

    const supabase = getSupabaseAdmin();
    
    // Get current max serial to continue counting (optional, but good)
    const { count } = await supabase
      .from("product_units")
      .select("*", { count: 'exact', head: true })
      .eq("product_id", characterId);

    const startIndex = count || 0;

    const units = Array.from({ length: quantity }, (_, i) => ({
      product_id: characterId,
      serial_number: `#${String(startIndex + i + 1).padStart(3, '0')}`,
      qr_token: `TECHBITS-${characterId.substring(0, 8)}-${randomUUID()}`,
      status: "unclaimed"
    }));

    const { data, error } = await supabase
      .from("product_units")
      .insert(units)
      .select("*");

    if (error) return jsonError(error.message, 400);

    // Update total_quantity on character
    await supabase.rpc('increment_character_quantity', { p_character_id: characterId, p_amount: quantity });

    return Response.json({ qrCodes: data }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
