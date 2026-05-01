"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addProductToCart } from "@/lib/cart";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Product, UserRole } from "@/lib/supabase/types";

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

export default function GlassModal({ isOpen, onClose, product }: GlassModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const backdropTransition = { duration: 0.18, ease: "easeOut" };
  const panelTransition = {
    type: "spring",
    damping: 26,
    stiffness: 360,
    mass: 0.8,
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const productDetails = product?.details?.trim() || "Each TechBits blind item is sealed and randomized. The collectible pin inside is selected from the active TechBits character pool and may include Common, Uncommon, Rare, or Legendary designs while supplies last.";
  const shippingPolicy = "Orders are prepared after purchase and typically ship within 4-6 weeks. Tracking details will be sent to the email used at checkout when the order leaves fulfillment. Because TechBits are blind collectibles, opened or claimed items are final sale. Damaged, missing, or incorrect shipments must be reported within 7 days of delivery with order details and photos so the team can review a replacement or store-credit resolution.";
  const isAdmin = userRole === "admin";

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) return;

      const response = await fetchWithAuth("/api/me");
      const result = await response.json();
      if (response.ok) setUserRole(result.profile?.role ?? null);
    }

    if (isOpen) loadRole();
  }, [isOpen]);

  function onAddToCart() {
    if (!product) return;
    if (isAdmin) {
      setCartMessage("Admins cannot add products to cart.");
      return;
    }

    addProductToCart(product);
    setCartMessage("Added to cart.");
  }

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 pointer-events-none backdrop-blur-[2px] sm:p-6 lg:p-12"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.96, y: 12, filter: "blur(4px)" }}
        transition={panelTransition}
        className="relative flex h-full max-h-[94vh] w-full max-w-7xl origin-center flex-col overflow-hidden rounded-lg bg-[#0a0a0a]/85 pointer-events-auto glass-panel will-change-transform md:flex-row"
      >
        {/* Glowing Background gradient within modal */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Modal Corner Brackets */}
        <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-white/30 z-10 pointer-events-none" />
        <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-white/30 z-10 pointer-events-none" />
        <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-white/30 z-10 pointer-events-none" />
        <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-white/30 z-10 pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-5 z-20 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50 transition-colors hover:text-white sm:right-10 sm:top-6"
        >
          Close <X className="w-3 h-3" />
        </button>

        {/* Inner Content Wrapper */}
        <div className="custom-scrollbar relative z-10 flex h-full w-full flex-col gap-8 overflow-y-auto p-5 pt-14 sm:p-8 sm:pt-16 md:flex-row md:gap-12 lg:p-16">
          
          {/* Left Column - Product Image Placeholder */}
          <div className="flex min-h-[240px] w-full flex-shrink-0 items-center justify-center md:min-h-full md:w-1/2">
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative h-60 w-60 sm:h-72 sm:w-72 md:h-96 md:w-96"
            >
               {/* Simulating black hoodie / dark product aesthetic */}
               <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
                 <div
                   className="w-2/3 h-2/3 bg-contain bg-no-repeat bg-center"
                   style={{ backgroundImage: `url('${product?.image_url ?? "/next.svg"}')` }}
                 />
                 <span className="absolute text-white/35 text-sm tracking-[0.4em] font-light">
                   {product ? "T-BIT" : "E V I L"}
                 </span>
               </div>
            </motion.div>
          </div>

          {/* Right Column - Product Details */}
          <div className="flex w-full flex-col justify-center space-y-8 pl-0 md:w-1/2 md:space-y-10 md:pl-10">
            
            <div className="space-y-4">
              <h2 className="text-2xl font-normal tracking-tight text-white/90 md:text-3xl">
                {product?.name ?? "Friday Deploys + Evil Rabbit Mk1 Hoodie"}
              </h2>
              <p className="text-sm font-light leading-relaxed text-white/60 max-w-lg">
                {product?.description ?? "The Evil Rabbit Mk1 Hoodie is crafted of 100% cotton French terry, featuring ribbed trim at the sleeve cuffs and hem, a drawcord-adjustable hood, and a pocket on the body. Designed and made in California by Friday Deploys."}
              </p>
              {product && (
                <p className="text-sm font-light text-white/50">
                  PHP {Number(product.price).toFixed(2)} / Stock {product.stock}
                </p>
              )}
            </div>

            <div className="space-y-6 pt-4">
              <div className="relative group">
                <button onClick={onAddToCart} disabled={!product || isAdmin} className="relative flex h-12 w-full items-center justify-center overflow-hidden bg-black/40 text-xs font-medium uppercase tracking-[0.18em] text-white/50 transition-all duration-300 hover:text-white disabled:opacity-50 sm:h-14 sm:tracking-[0.2em]">
                  <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                    {isAdmin ? "Admin Preview Only" : product ? "Add to Cart" : "Unavailable"}
                  </span>
                  
                  {/* Button bracket styling */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-white/50 transition-colors" />
                </button>
              </div>
              {cartMessage && <p className="text-xs uppercase tracking-[0.18em] text-white/45">{cartMessage}</p>}
              
              <p className="text-[11px] text-white/40 font-light tracking-wide">
                Made to Order: Ships in 4-6 weeks
              </p>
            </div>

            <div className="space-y-0 pt-4 border-t border-white/10">
              {[
                { id: "details", label: "Product Details", content: productDetails },
                { id: "shipping", label: "Shipping & Returns", content: shippingPolicy },
              ].map((section) => (
                <div key={section.id} className="border-b border-white/10">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between py-5 text-xs tracking-wide text-white/70 hover:text-white transition-colors font-medium group"
                  >
                    <span>{section.label}</span>
                    <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">
                      {expandedSection === section.id ? "Close -" : "Open +"}
                    </span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: expandedSection === section.id ? "auto" : 0, opacity: expandedSection === section.id ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6 text-xs leading-relaxed text-white/50 font-light pr-4">
                      {section.content}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
