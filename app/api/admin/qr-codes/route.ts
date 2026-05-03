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
      .order("product_id", { ascending: true })
      .order("serial_number", { ascending: true });

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

    const { data: character, error: characterError } = await supabase
      .from("techbits_characters")
      .select("id, total_quantity")
      .eq("id", characterId)
      .single();

    if (characterError || !character) return jsonError("Character not found.", 404);

    const { data: existingUnits, error: existingUnitsError } = await supabase
      .from("product_units")
      .select("id, serial_number")
      .eq("product_id", characterId)
      .order("serial_number", { ascending: true });

    if (existingUnitsError) return jsonError(existingUnitsError.message, 400);

    const startIndex = Math.max(...(existingUnits ?? []).map((unit) => Number(unit.serial_number) || 0), 0);
    const newTotalQuantity = Math.max(Number(character.total_quantity ?? 0), startIndex + quantity);

    const units = Array.from({ length: quantity }, (_, i) => ({
      product_id: characterId,
      serial_number: startIndex + i + 1,
      total_quantity: newTotalQuantity,
      display_number: `#${startIndex + i + 1}/${newTotalQuantity}`,
      qr_token: `TECHBITS-${characterId.substring(0, 8)}-${randomUUID()}`,
      status: "unclaimed",
    }));

    const { data, error } = await supabase
      .from("product_units")
      .insert(units)
      .select("*");

    if (error) return jsonError(error.message, 400);

    const { error: characterUpdateError } = await supabase
      .from("techbits_characters")
      .update({ total_quantity: newTotalQuantity })
      .eq("id", characterId);

    if (characterUpdateError) return jsonError(characterUpdateError.message, 400);

    if (existingUnits?.length) {
      const relabelResults = await Promise.all(
        existingUnits.map((unit) =>
          supabase
            .from("product_units")
            .update({
              total_quantity: newTotalQuantity,
              display_number: `#${Number(unit.serial_number)}/${newTotalQuantity}`,
            })
            .eq("id", unit.id)
        )
      );

      const relabelError = relabelResults.find((result) => result.error)?.error;
      if (relabelError) return jsonError(relabelError.message, 400);
    }

    return Response.json({ qrCodes: data }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
