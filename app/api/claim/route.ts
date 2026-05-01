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
    const { data, error } = await supabase.rpc("claim_qr_code_for_user", {
      p_qr_value: qrValue,
      p_user_id: user.id,
    });

    if (error) {
      if (error.message.includes("DUPLICATE_CLAIM")) return jsonError("You have already claimed this collectible.", 409);
      if (error.message.includes("SOLD_OUT")) return jsonError("All available collectibles have been claimed.", 409);
      if (error.message.includes("DISABLED_QR")) return jsonError("This QR code is disabled.", 403);
      if (error.message.includes("COOLDOWN")) return jsonError("Please wait a moment before scanning again.", 429);
      if (error.message.includes("INVALID_QR")) return jsonError("This QR code is invalid.", 404);
      return jsonError(error.message, 400);
    }

    const claim = data?.[0] ?? null;

    if (!claim) {
      return Response.json({ claim: null });
    }

    const { data: character, error: characterError } = await supabase
      .from("techbits_characters")
      .select("id, name, description, image_url, classification")
      .eq("id", claim.character_id)
      .single();

    if (characterError) return jsonError(characterError.message, 500);

    return Response.json({
      claim: {
        ...claim,
        character,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
