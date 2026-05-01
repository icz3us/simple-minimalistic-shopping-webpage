"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export async function authHeaders() {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = await authHeaders();
  const requestHeaders = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  Object.entries(headers).forEach(([key, value]) => requestHeaders.set(key, value));

  return fetch(input, {
    ...init,
    headers: requestHeaders,
  });
}
