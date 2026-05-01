"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { CartItem, cartChangedEvent, getCartItems, setCartItems } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      const hasSession = Boolean(data.session);
      setIsLoggedIn(hasSession);

      if (hasSession) {
        const response = await fetchWithAuth("/api/me");
        const result = await response.json();
        if (response.ok) setUserRole(result.profile?.role ?? null);
      }

      setCheckingAuth(false);
    }

    loadSession();
  }, []);

  function updateItems(nextItems: CartItem[]) {
    const normalizedItems = nextItems.filter((item) => item.quantity > 0);
    setItems(normalizedItems);
    setCartItems(normalizedItems);
    window.dispatchEvent(new Event(cartChangedEvent));
  }

  function changeQuantity(productId: string, delta: number) {
    updateItems(items.map((item) => (
      item.productId === productId ? { ...item, quantity: Math.max(item.quantity + delta, 0) } : item
    )));
  }

  function removeItem(productId: string) {
    updateItems(items.filter((item) => item.productId !== productId));
  }

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const isAdmin = userRole === "admin";

  return (
    <TechShell title="Shopping Cart" subtitle="Review selected TechBits blind items before checkout.">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
        <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Cart Items</h2>
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.productId} className="grid gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[96px_1fr_auto]">
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-24 sm:w-24">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-white/20">T-BIT</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/80">{item.name}</p>
                  <p className="mt-2 text-sm text-white/45">PHP {item.price.toFixed(2)}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button onClick={() => changeQuantity(item.productId, -1)} className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/45 hover:text-white">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm text-white/70">{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.productId, 1)} className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/45 hover:text-white">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeItem(item.productId)} className="ml-2 flex h-8 w-8 items-center justify-center text-white/35 hover:text-red-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/65 sm:text-right">PHP {(item.price * item.quantity).toFixed(2)}</p>
              </article>
            ))}
            {items.length === 0 && (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
                Your cart is empty.
              </div>
            )}
          </div>
        </section>

        <aside className="glass-panel h-fit rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Summary</h2>
          <div className="space-y-4 text-sm text-white/55">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-white/80">PHP {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Items</span>
              <span className="text-white/80">{items.reduce((total, item) => total + item.quantity, 0)}</span>
            </div>
          </div>

          <button
            disabled={!isLoggedIn || isAdmin || items.length === 0 || checkingAuth}
            onClick={() => router.push("/cart/checkout")}
            className="mt-6 h-12 w-full bg-white text-xs uppercase tracking-[0.22em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white disabled:opacity-40"
          >
            Proceed to Checkout
          </button>

          {!checkingAuth && !isLoggedIn && (
            <p className="mt-4 text-sm leading-6 text-white/45">
              Checkout is unavailable until you log in. <Link href="/login" className="text-white/80 hover:text-white">Log in</Link>
            </p>
          )}
          {!checkingAuth && isAdmin && (
            <p className="mt-4 text-sm leading-6 text-white/45">
              Admin accounts cannot check out products.
            </p>
          )}
        </aside>
      </div>
    </TechShell>
  );
}
