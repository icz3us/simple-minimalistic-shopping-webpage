import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export type VerifiedUser = {
  id: string;
  email: string;
  profile: Profile;
};

export async function verifyRequestUser(request: NextRequest): Promise<VerifiedUser> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user?.email) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  return {
    id: userData.user.id,
    email: userData.user.email,
    profile: profile as Profile,
  };
}

export async function verifyAdmin(request: NextRequest): Promise<VerifiedUser> {
  const user = await verifyRequestUser(request);

  if (user.profile.role !== "admin") {
    throw new Error("Forbidden");
  }

  return user;
}
