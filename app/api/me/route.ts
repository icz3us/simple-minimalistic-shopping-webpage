import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyRequestUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyRequestUser(request);
    return Response.json({ user: { id: user.id, email: user.email }, profile: user.profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
