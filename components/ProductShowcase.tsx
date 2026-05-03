"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GlassModal from "./GlassModal";
import type { Product } from "@/lib/supabase/types";

type ProductShowcaseProps = {
  onInspectChange?: (isInspecting: boolean) => void;
};

export default function ProductShowcase({ onInspectChange }: ProductShowcaseProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const pauseMobileMotion = isModalOpen && isMobile;
  const pages = chunkProducts(products, 1);
  const maxPageIndex = Math.max(pages.length - 1, 0);
  const activePageIndex = Math.min(pageIndex, maxPageIndex);
  const canGoPrevious = activePageIndex > 0;
  const canGoNext = activePageIndex < maxPageIndex;

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

  function openInspect(product: Product | null) {
    setSelectedProduct(product);
    setIsModalOpen(true);
    onInspectChange?.(true);
  }

  function closeInspect() {
    setIsModalOpen(false);
    onInspectChange?.(false);
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 pt-24 pb-24 sm:px-6">
      <div className="relative z-10 w-full max-w-7xl">
        <button
          type="button"
          aria-label="Previous products"
          disabled={!canGoPrevious}
          onClick={() => setPageIndex(Math.max(activePageIndex - 1, 0))}
          className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/80 text-white shadow-[0_0_24px_rgba(255,255,255,0.18),inset_0_0_14px_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/70 hover:bg-white/15 hover:shadow-[0_0_36px_rgba(255,255,255,0.28),inset_0_0_18px_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-black/65 disabled:text-white/45 disabled:shadow-[0_0_18px_rgba(255,255,255,0.1)] sm:left-2 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:left-8"
        >
          <ChevronLeft className="h-5 w-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.75)] sm:h-6 sm:w-6" />
        </button>

        <div className="overflow-hidden px-10 py-16 sm:px-14 md:px-16">
          <motion.div
            animate={{ x: `-${activePageIndex * 100}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 24, mass: 0.8 }}
            className="flex"
          >
            {pages.length ? pages.map((page, pageNumber) => (
              <div
                key={pageNumber}
                className="flex min-w-full flex-wrap items-center justify-center gap-x-8 gap-y-20"
              >
                {page.map((product, productIndex) => (
                  <ProductFloatCard
                    key={product.id}
                    product={product}
                    pauseMobileMotion={pauseMobileMotion}
                    motionOffset={productIndex}
                    onInspect={() => openInspect(product)}
                  />
                ))}
              </div>
            )) : (
              <div className="flex min-w-full items-center justify-center px-4 py-20 text-center">
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative max-w-2xl"
                >
                  <div className="absolute -inset-8 rounded-full bg-white/[0.04] blur-3xl" />
                  <div className="relative border-y border-white/10 px-4 py-8 sm:px-10">
                    <p className="text-[10px] font-light uppercase tracking-[0.34em] text-white/25 sm:text-xs">
                      Collection Status
                    </p>
                    <p className="mt-4 text-lg font-light uppercase leading-8 tracking-[0.2em] text-white/75 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] sm:text-2xl sm:leading-10 sm:tracking-[0.24em]">
                      No Product Yet
                    </p>
                    <p className="mt-3 text-xs font-light uppercase leading-6 tracking-[0.18em] text-white/40 sm:text-sm sm:tracking-[0.22em]">
                      Wait for the new drop of Collection!
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        <button
          type="button"
          aria-label="Next products"
          disabled={!canGoNext}
          onClick={() => setPageIndex(Math.min(activePageIndex + 1, maxPageIndex))}
          className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/80 text-white shadow-[0_0_24px_rgba(255,255,255,0.18),inset_0_0_14px_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/70 hover:bg-white/15 hover:shadow-[0_0_36px_rgba(255,255,255,0.28),inset_0_0_18px_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-black/65 disabled:text-white/45 disabled:shadow-[0_0_18px_rgba(255,255,255,0.1)] sm:right-2 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:right-8"
        >
          <ChevronRight className="h-5 w-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.75)] sm:h-6 sm:w-6" />
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <GlassModal 
            isOpen={isModalOpen} 
            onClose={closeInspect} 
            product={selectedProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductFloatCard({
  product,
  pauseMobileMotion,
  motionOffset,
  onInspect,
}: {
  product: Product | null;
  pauseMobileMotion: boolean;
  motionOffset: number;
  onInspect: () => void;
}) {
  return (
    <div className="group relative z-10 cursor-pointer" onClick={onInspect}>
      <motion.div
        animate={pauseMobileMotion ? { y: 0, rotateY: 0 } : { y: [-15, 15, -15], rotateY: [0, 180, 360] }}
        transition={pauseMobileMotion ? { duration: 0 } : { duration: 10, repeat: Infinity, ease: "linear", delay: motionOffset * 0.35 }}
        className="relative h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72 xl:h-80 xl:w-80"
      >
        {/* Main Product Placeholder (A glowing TechBits Module) */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-tr from-white/10 to-transparent shadow-[0_0_100px_rgba(255,255,255,0.05)] backdrop-blur-md transition-all duration-700 group-hover:border-white/40 group-hover:shadow-[0_0_120px_rgba(255,255,255,0.1)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-full bg-white/5 blur-2xl" />
          </div>
          {/* The "Brain" or "Core" of the bit */}
          <div className="absolute inset-1/4 flex items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-black/50 backdrop-blur-sm">
            {product?.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, (max-width: 1280px) 144px, 160px"
                className="object-cover opacity-80 transition-opacity duration-700 group-hover:opacity-100"
              />
            ) : (
              <motion.div
                animate={pauseMobileMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                transition={pauseMobileMotion ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-16 w-16 rounded-full bg-white/80 blur-md"
              />
            )}
            <div className="absolute inset-0 bg-black/25" />
            <span className="absolute z-10 text-xs font-light tracking-[0.3em] text-white/70">
              BLIND ITEM
            </span>
          </div>
        </div>
      </motion.div>

      {product && (
        <div className="pointer-events-none absolute -bottom-12 left-1/2 w-[min(74vw,360px)] -translate-x-1/2 text-center sm:-bottom-10">
          <p className="truncate text-lg uppercase tracking-[0.16em] text-white/75 sm:text-xl sm:tracking-[0.18em] xl:text-2xl">{product.name}</p>
          <p className="mt-1 text-xs text-white/35">PHP {Number(product.price).toFixed(2)} / Stock {product.stock}</p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-light tracking-[0.18em] text-white/30 sm:-bottom-16 sm:text-xs sm:tracking-[0.2em]"
      >
        [ CLICK TO INSPECT ]
      </motion.div>
    </div>
  );
}

function chunkProducts(products: Product[], size: number) {
  const safeSize = Math.max(size, 1);
  const chunks: Product[][] = [];

  for (let index = 0; index < products.length; index += safeSize) {
    chunks.push(products.slice(index, index + safeSize));
  }

  return chunks;
}
