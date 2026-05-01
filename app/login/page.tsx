"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const response = await fetchWithAuth("/api/me");
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to load profile.");
      setLoading(false);
      return;
    }

    router.replace(data.profile.role === "admin" ? "/admin" : "/");
  }

  return (
    <TechShell title="Access TechBits" subtitle="Sign in to claim collectible pins, review your collection, or manage TechBits inventory.">
      <form onSubmit={onSubmit} className="glass-panel mx-auto max-w-md rounded-lg bg-[#0a0a0a]/80 p-8">
        <div className="space-y-5">
          <label className="block text-xs uppercase tracking-[0.25em] text-white/45">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.25em] text-white/45">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          </label>
          {message && <p className="text-sm text-red-200">{message}</p>}
          <button
            disabled={loading}
            className="relative h-12 w-full bg-white/10 text-xs uppercase tracking-[0.22em] text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Login"}
          </button>
          <p className="text-center text-xs text-white/45">
            New collector? <Link href="/register" className="text-white/80 hover:text-white">Create an account</Link>
          </p>
        </div>
      </form>
    </TechShell>
  );
}
