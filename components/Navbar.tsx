"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { LogOut, Menu, ShoppingCart, UserCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { fetchWithAuth } from "@/lib/auth/client";
import { cartChangedEvent, getCartCount } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export default function Navbar({ absolute = false }: { absolute?: boolean }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartCount = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(cartChangedEvent, onStoreChange);
      return () => window.removeEventListener(cartChangedEvent, onStoreChange);
    },
    getCartCount,
    () => 0
  );

  useEffect(() => {
    let isMounted = true;

    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (!isMounted || !data.session) return;

      setUserEmail(data.session.user.email ?? "");
      const response = await fetchWithAuth("/api/me");
      if (!isMounted || !response.ok) return;

      const json = await response.json();
      setProfile(json.profile);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function closeMenus() {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/login";
  }

  const accountLabel = profile?.full_name || userEmail.split("@")[0] || "Account";
  const navClass = absolute 
    ? "absolute top-0 z-20 flex w-full flex-col gap-3 p-4 pointer-events-none sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10"
    : "flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-6";

  function renderNavItems(closeOnNavigate = false) {
    const linkProps = closeOnNavigate ? { onClick: closeMenus } : {};

    return (
      <>
        {pathname !== "/" && (
          <Link href="/" className="hover:text-white transition-colors" {...linkProps}>HOME</Link>
        )}
        <Link href="/dashboard" className="hover:text-white transition-colors" {...linkProps}>COLLECTION / CLAIM</Link>
        <Link href="/dashboard/orders" className="hover:text-white transition-colors" {...linkProps}>MY ORDERS</Link>
        
        <Link href="/cart" className="flex items-center gap-2 hover:text-white transition-colors" {...linkProps}>
          <ShoppingCart className="h-4 w-4" /> CART{cartCount > 0 ? ` (${cartCount})` : ""}
        </Link>
        
        {profile ? (
          <div className="relative">
            <button type="button" onClick={() => setIsAccountOpen((open) => !open)} className="flex items-center gap-2 hover:text-white transition-colors">
              <UserCircle className="h-4 w-4" /> {accountLabel}
            </button>
            {isAccountOpen && (
              <div className="absolute right-0 mt-3 w-56 border border-white/10 bg-black/90 p-3 text-left shadow-2xl backdrop-blur-md max-sm:left-0 max-sm:right-auto z-50">
                {profile.role === "admin" && (
                  <Link href="/admin" className="block px-3 py-2 hover:bg-white/10 hover:text-white" {...linkProps}>
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
          <Link href="/login" className="hover:text-white transition-colors" {...linkProps}>LOGIN</Link>
        )}
      </>
    );
  }

  return (
    <nav className={navClass}>
      <div className="flex w-full items-center justify-between gap-4 pointer-events-auto sm:w-auto">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <span className="text-xs font-light uppercase tracking-[0.24em] text-white/90 sm:text-sm sm:tracking-[0.3em]">
            TECHBITS COLLECTION
          </span>
        </Link>

        <button
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center border border-white/15 bg-black/30 text-white/80 transition-colors hover:border-white/30 hover:text-white sm:hidden"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="pointer-events-auto hidden flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-light tracking-widest text-white/50 sm:flex sm:justify-end sm:text-xs">
        {renderNavItems()}
      </div>

      {isMenuOpen && (
        <div className="pointer-events-auto flex flex-col gap-4 border border-white/10 bg-black/85 p-4 text-[11px] font-light tracking-widest text-white/60 shadow-2xl backdrop-blur-md sm:hidden">
          {renderNavItems(true)}
        </div>
      )}
    </nav>
  );
}
