"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ShoppingCart, UserCircle } from "lucide-react";
import BackgroundEffects from "@/components/BackgroundEffects";
import ProductShowcase from "@/components/ProductShowcase";
import { fetchWithAuth } from "@/lib/auth/client";
import { cartChangedEvent, getCartCount } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export default function Home() {
  const [typedText, setTypedText] = useState("");
  const [introState, setIntroState] = useState<"typing" | "sliding" | "done">("typing");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const fullText = "By Linkedin Park";

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (introState === "typing") {
      if (typedText.length < fullText.length) {
        timeout = setTimeout(() => {
          setTypedText(fullText.slice(0, typedText.length + 1));
        }, 80); // Typing speed
      } else {
        timeout = setTimeout(() => {
          setIntroState("sliding");
        }, 1200); // Delay after typing finishes
      }
    }

    if (introState === "sliding") {
      timeout = setTimeout(() => {
        setIntroState("done");
      }, 1200); // Duration of the slide animation
    }

    return () => clearTimeout(timeout);
  }, [typedText, introState, fullText]);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) return;

      const response = await fetchWithAuth("/api/me");
      const result = await response.json();

      if (response.ok) {
        setProfile(result.profile);
        setUserEmail(result.user?.email ?? result.profile?.email ?? "");
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
        setUserEmail("");
        setIsAccountOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function updateCartCount() {
      setCartCount(getCartCount());
    }

    updateCartCount();
    window.addEventListener(cartChangedEvent, updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener(cartChangedEvent, updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setProfile(null);
    setUserEmail("");
    setIsAccountOpen(false);
  }

  const showMainUI = introState !== "typing";
  const accountLabel = profile?.full_name || userEmail || (profile?.role === "admin" ? "Admin" : "User");

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black text-white">

      {/* Intro Sequence Overlay */}
      <AnimatePresence>
        {introState !== "done" && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{
                y: introState === "sliding" ? "-30vh" : 0,
                scale: introState === "sliding" ? 0.6 : 1,
                opacity: introState === "sliding" ? 0 : 1
              }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-4 px-6 text-center">
                <h1 className="text-3xl font-light uppercase tracking-[0.24em] text-white/90 sm:text-4xl md:text-6xl md:tracking-[0.3em]">
                  TECHBITS
                </h1>
              </div>

              <div className="flex h-8 items-center px-6 text-center text-xs font-light uppercase tracking-[0.28em] text-white/50 sm:text-sm md:text-lg md:tracking-[0.4em]">
                {typedText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="ml-2 inline-block w-1.5 h-5 bg-white/50"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content (fades in as intro slides up) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showMainUI ? 1 : 0 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
        className="absolute inset-0 z-10 flex flex-col"
      >
        <BackgroundEffects />

        {/* Top Navigation */}
        <nav className="absolute top-0 z-20 flex w-full flex-col gap-4 p-4 pointer-events-none sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10">
          <div className="flex items-center gap-3 pointer-events-auto cursor-pointer">
            <span className="text-xs font-light uppercase tracking-[0.24em] sm:text-sm sm:tracking-[0.3em]">TECHBITS COLLECTION</span>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-light tracking-widest text-white/50 sm:justify-end sm:text-xs">
            <Link href="/dashboard" className="hover:text-white transition-colors">CLAIM QR</Link>
            <Link href="/cart" className="flex items-center gap-2 hover:text-white transition-colors">
              <ShoppingCart className="h-4 w-4" /> CART{cartCount ? ` (${cartCount})` : ""}
            </Link>
            {profile ? (
              <div className="relative">
                <button onClick={() => setIsAccountOpen((open) => !open)} className="flex items-center gap-2 hover:text-white transition-colors">
                  <UserCircle className="h-4 w-4" /> {accountLabel}
                </button>
                {isAccountOpen && (
                  <div className="absolute right-0 mt-3 w-56 border border-white/10 bg-black/90 p-3 text-left shadow-2xl backdrop-blur-md max-sm:left-0 max-sm:right-auto">
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

        {/* Main Content */}
        <div className="relative z-10 w-full h-full">
          <ProductShowcase />
        </div>

        {/* Footer / Corner Info */}
        <div className="absolute bottom-4 left-4 z-20 max-w-[calc(100%-2rem)] text-[10px] font-light tracking-[0.18em] text-white/30 pointer-events-none sm:bottom-10 sm:left-10 sm:text-xs sm:tracking-[0.2em]">
          [ SYSTEM ONLINE - V1.0 ]
        </div>
      </motion.div>
    </main>
  );
}
