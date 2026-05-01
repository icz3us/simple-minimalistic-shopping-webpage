"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized">("checking");

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      const { data } = await supabaseBrowser.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const response = await fetchWithAuth("/api/me");
      const result = await response.json();

      if (!response.ok || result.profile?.role !== "admin") {
        router.replace("/");
        return;
      }

      if (isMounted) setStatus("authorized");
    }

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (status === "checking") {
    return <TechShell title="Admin Dashboard" subtitle="Verifying admin access..." />;
  }

  return children;
}
