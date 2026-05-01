"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, ShoppingCart, UserCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { fetchWithAuth } from "@/lib/auth/client";
import { cartChangedEvent, getCartCount } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export default function Navbar({ absolute = false }: { absolute?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadUser();
    updateCartCount();

    const handleCartChange = () => updateCartCount();
    window.addEventListener(cartChangedEvent, handleCartChange);
    return () => window.removeEventListener(cartChangedEvent, handleCartChange);
  }, []);

  function updateCartCount() {
    setCartCount(getCartCount());
  }

  async function loadUser() {
    const { data } = await supabaseBrowser.auth.getSession();
    if (data.session) {
      setUserEmail(data.session.user.email ?? "");
      const response = await fetchWithAuth("/api/me");
      if (response.ok) {
        const json = await response.json();
        setProfile(json.profile);
      }
    }
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/login";
  }

  const accountLabel = profile?.full_name || userEmail.split("@")[0] || "Account";
  const navClass = absolute 
    ? "absolute top-0 z-20 flex w-full flex-col gap-4 p-4 pointer-events-none sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10"
    : "flex w-full flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-6";

  return (
    <nav className={navClass}>
      <Link href="/" className="flex items-center gap-3 pointer-events-auto cursor-pointer">
        <span className="text-xs font-light uppercase tracking-[0.24em] text-white/90 sm:text-sm sm:tracking-[0.3em]">
          TECHBITS COLLECTION
        </span>
      </Link>

      <div className="pointer-events-auto flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-light tracking-widest text-white/50 sm:justify-end sm:text-xs">
        {pathname !== "/" && (
          <Link href="/" className="hover:text-white transition-colors">HOME</Link>
        )}
        <Link href="/dashboard" className="hover:text-white transition-colors">COLLECTION / CLAIM</Link>
        <Link href="/dashboard/orders" className="hover:text-white transition-colors">MY ORDERS</Link>
        
        <Link href="/cart" className="flex items-center gap-2 hover:text-white transition-colors">
          <ShoppingCart className="h-4 w-4" /> CART{cartCount > 0 ? ` (${cartCount})` : ""}
        </Link>
        
        {profile ? (
          <div className="relative">
            <button onClick={() => setIsAccountOpen((open) => !open)} className="flex items-center gap-2 hover:text-white transition-colors">
              <UserCircle className="h-4 w-4" /> {accountLabel}
            </button>
            {isAccountOpen && (
              <div className="absolute right-0 mt-3 w-56 border border-white/10 bg-black/90 p-3 text-left shadow-2xl backdrop-blur-md max-sm:left-0 max-sm:right-auto z-50">
                {profile.role === "admin" && (
                  <Link href="/admin" className="block px-3 py-2 hover:bg-white/10 hover:text-white">
                    Admin Dashboard
                  </Link>
                )}
                <button onClick={signOut} className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="hover:text-white transition-colors">LOGIN</Link>
        )}
      </div>
    </nav>
  );
}
