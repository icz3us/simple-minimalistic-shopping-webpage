import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("products")
      .update({
        name: String(body.name ?? "").trim(),
        description: String(body.description ?? "").trim(),
        details: String(body.details ?? "").trim(),
        price: Number(body.price ?? 0),
        stock: Number(body.stock ?? 0),
        image_url: body.image_url ? String(body.image_url).trim() : null,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);
    return Response.json({ product: data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await verifyAdmin(request);
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) return jsonError(error.message, 400);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
