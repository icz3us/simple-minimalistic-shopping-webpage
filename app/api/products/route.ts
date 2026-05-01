import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return jsonError(error.message, 500);
  return Response.json({ products: data ?? [] });
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (countError) return jsonError(countError.message, 500);
    if ((count ?? 0) >= 1) {
      return jsonError("Only one product listing is allowed. Edit or delete the existing product first.", 409);
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: String(body.name ?? "").trim(),
        description: String(body.description ?? "").trim(),
        details: String(body.details ?? "").trim(),
        price: Number(body.price ?? 0),
        stock: Number(body.stock ?? 0),
        image_url: body.image_url ? String(body.image_url).trim() : null,
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);
    return Response.json({ product: data }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
