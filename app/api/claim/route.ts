import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyRequestUser } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequestUser(request);
    const body = await request.json();
    const qrValue = String(body.qr_value ?? "").trim();

    if (!qrValue) return jsonError("Missing QR value", 400);

    const supabase = getSupabaseAdmin();
    
    // 1. Find the unit
    const { data: unit, error: unitError } = await supabase
      .from("product_units")
      .select("*")
      .eq("qr_token", qrValue)
      .single();

    if (unitError || !unit) return jsonError("This QR code is invalid.", 404);
    if (unit.status === "disabled") return jsonError("This QR code is disabled.", 403);
    if (unit.status === "claimed" || unit.claimed_by) return jsonError("This collectible has already been redeemed.", 409);

    // 2. Claim it atomically
    const { data: updatedUnit, error: updateError } = await supabase
      .from("product_units")
      .update({ status: "claimed", claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", unit.id)
      .eq("status", "unclaimed")
      .select("*")
      .single();

    if (updateError || !updatedUnit) return jsonError("This collectible has already been redeemed.", 409);

    // 3. Add to user_collections
    const { data: collection, error: collectionError } = await supabase
      .from("user_collections")
      .insert({
        user_id: user.id,
        character_id: unit.product_id,
        product_unit_id: unit.id,
      })
      .select("*")
      .single();

    // 4. Log claim scan
    await supabase.from("claim_scans").insert({
       user_id: user.id,
       character_id: unit.product_id,
       product_unit_id: unit.id,
       qr_value: qrValue,
       status: "success"
    });

    const { data: character, error: characterError } = await supabase
      .from("techbits_characters")
      .select("id, name, description, image_url, classification")
      .eq("id", unit.product_id)
      .single();

    if (characterError) return jsonError(characterError.message, 500);

    return Response.json({
      claim: {
        ...collection,
        product_units: updatedUnit,
        character,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
