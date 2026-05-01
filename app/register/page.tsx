"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import TechShell from "@/components/TechShell";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      return;
    }

    setMessage("Registration created. Confirm your email before logging in.");
    setLoading(false);
  }

  return (
    <TechShell title="Register Collector" subtitle="Create a customer account for claiming physical TechBits pins online.">
      <form onSubmit={onSubmit} className="glass-panel mx-auto max-w-md rounded-lg bg-[#0a0a0a]/80 p-8">
        <div className="space-y-5">
          <label className="block text-xs uppercase tracking-[0.25em] text-white/45">
            Full Name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          </label>
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
              minLength={8}
              required
              className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          </label>
          {message && <p className="text-sm text-white/65">{message}</p>}
          <button
            disabled={loading}
            className="h-12 w-full bg-white/10 text-xs uppercase tracking-[0.22em] text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Register"}
          </button>
          <p className="text-center text-xs text-white/45">
            Already registered? <Link href="/login" className="text-white/80 hover:text-white">Login</Link>
          </p>
        </div>
      </form>
    </TechShell>
  );
}
