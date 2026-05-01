import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

type Params = { params: Promise<{ id: string }> };
const roles: UserRole[] = ["user", "admin"];

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await verifyAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const role = String(body.role ?? "") as UserRole;

    if (!roles.includes(role)) {
      return jsonError("Invalid role.", 400);
    }

    if (admin.id === id && role !== "admin") {
      return jsonError("You cannot remove your own admin role.", 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);
    return Response.json({ user: data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
