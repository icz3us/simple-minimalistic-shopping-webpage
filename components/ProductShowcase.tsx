"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassModal from "./GlassModal";
import type { Product } from "@/lib/supabase/types";

type ProductShowcaseProps = {
  onInspectChange?: (isInspecting: boolean) => void;
};

export default function ProductShowcase({ onInspectChange }: ProductShowcaseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const activeProduct = products[0] ?? null;
  const pauseMobileMotion = isModalOpen && isMobile;

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const syncMobileState = () => setIsMobile(mobileQuery.matches);

    syncMobileState();
    mobileQuery.addEventListener("change", syncMobileState);
    return () => mobileQuery.removeEventListener("change", syncMobileState);
  }, []);

  function openInspect() {
    setIsModalOpen(true);
    onInspectChange?.(true);
  }

  function closeInspect() {
    setIsModalOpen(false);
    onInspectChange?.(false);
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 pt-24 pb-20 sm:px-6">
      {/* Centered Product Element */}
      <div 
        className="relative z-10 cursor-pointer group"
        onClick={openInspect}
      >
        <motion.div
          animate={pauseMobileMotion ? { y: 0, rotateY: 0 } : { y: [-15, 15, -15], rotateY: [0, 180, 360] }}
          transition={pauseMobileMotion ? { duration: 0 } : { duration: 10, repeat: Infinity, ease: "linear" }}
          className="relative h-56 w-56 sm:h-72 sm:w-72 md:h-96 md:w-96"
        >
          {/* Main Product Placeholder (A glowing TechBits Module) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-3xl border border-white/20 backdrop-blur-md shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden group-hover:border-white/40 group-hover:shadow-[0_0_120px_rgba(255,255,255,0.1)] transition-all duration-700">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-white/5 rounded-full blur-2xl" />
            </div>
            {/* The "Brain" or "Core" of the bit */}
            <div className="absolute inset-1/4 rounded-2xl border border-white/30 bg-black/50 backdrop-blur-sm flex items-center justify-center overflow-hidden">
               {activeProduct?.image_url ? (
                 <Image
                   src={activeProduct.image_url}
                   alt={activeProduct.name}
                   fill
                   sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 192px"
                   className="object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100"
                 />
               ) : (
                 <motion.div
                   animate={pauseMobileMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                   transition={pauseMobileMotion ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="w-16 h-16 rounded-full bg-white/80 blur-md"
                 />
               )}
               <div className="absolute inset-0 bg-black/25" />
               <span className="absolute text-white/70 text-xs tracking-[0.3em] font-light z-10">
                 BLIND ITEM
               </span>
            </div>
          </div>
        </motion.div>
        {activeProduct && (
          <div className="absolute -bottom-12 left-1/2 w-[min(92vw,620px)] -translate-x-1/2 text-center pointer-events-none sm:-bottom-10">
            <p className="text-lg uppercase tracking-[0.16em] text-white/75 sm:text-2xl sm:tracking-[0.18em] md:text-3xl">{activeProduct.name}</p>
            <p className="mt-1 text-xs text-white/35">PHP {Number(activeProduct.price).toFixed(2)} / Stock {activeProduct.stock}</p>
          </div>
        )}
        
        {/* Subtle Indicator to Hover/Click */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isModalOpen ? 0 : 1 }}
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-light tracking-[0.18em] text-white/30 pointer-events-none sm:-bottom-16 sm:text-xs sm:tracking-[0.2em]"
        >
          [ CLICK TO INSPECT ]
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <GlassModal 
            isOpen={isModalOpen} 
            onClose={closeInspect} 
            product={activeProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
