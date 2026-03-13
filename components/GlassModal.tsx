"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlassModal({ isOpen, onClose }: GlassModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sizes = ["S", "M", "L", "XL", "XXL"];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-20 pointer-events-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="relative w-full max-w-7xl h-full max-h-[90vh] glass-panel rounded-lg overflow-hidden pointer-events-auto flex flex-col md:flex-row bg-[#0a0a0a]/80"
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
          className="absolute top-6 right-12 z-20 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono"
        >
          Close <X className="w-3 h-3" />
        </button>

        {/* Inner Content Wrapper */}
        <div className="relative z-10 w-full h-full flex flex-col md:flex-row p-8 md:p-16 gap-12 overflow-y-auto custom-scrollbar">
          
          {/* Left Column - Product Image Placeholder */}
          <div className="w-full md:w-1/2 flex-shrink-0 flex items-center justify-center min-h-[300px] md:min-h-full">
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-64 h-64 md:w-96 md:h-96"
            >
               {/* Simulating black hoodie / dark product aesthetic */}
               <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden">
                 <div className="w-2/3 h-2/3 opacity-30 bg-[url('/next.svg')] bg-contain bg-no-repeat bg-center mix-blend-overlay filter invert" />
                 <span className="absolute text-white/20 text-sm tracking-[0.4em] font-light">E V I L</span>
               </div>
            </motion.div>
          </div>

          {/* Right Column - Product Details */}
          <div className="w-full md:w-1/2 flex flex-col justify-center space-y-10 pl-0 md:pl-10">
            
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-white/90">
                Friday Deploys + Evil Rabbit Mk1 Hoodie
              </h2>
              <p className="text-sm font-light leading-relaxed text-white/60 max-w-lg">
                The Evil Rabbit Mk1 Hoodie is crafted of 100% cotton French terry, featuring ribbed trim at the sleeve cuffs and hem, a drawcord-adjustable hood, and a pocket on the body. Designed and made in California by Friday Deploys.
              </p>
            </div>

            <div className="space-y-6 pt-4">
              <div className="flex gap-4">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "w-10 h-10 md:w-11 md:h-11 rounded-md border flex items-center justify-center text-xs md:text-sm font-medium transition-all duration-300",
                      selectedSize === size
                        ? "border-white/80 bg-white/10 text-white"
                        : "border-white/20 text-white/50 hover:border-white/50 hover:text-white"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <button className="w-full h-14 bg-black/40 text-white/50 hover:text-white transition-all duration-300 uppercase tracking-[0.2em] text-xs font-medium relative flex items-center justify-center overflow-hidden">
                  <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">Select a Size</span>
                  
                  {/* Button bracket styling */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-white/50 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-white/50 transition-colors" />
                </button>
              </div>
              
              <p className="text-[11px] text-white/40 font-light tracking-wide">
                Made to Order: Ships in 4-6 weeks
              </p>
            </div>

            <div className="space-y-0 pt-4 border-t border-white/10">
              {[
                { id: "details", label: "Product Details" },
                { id: "fit", label: "Size & Fit" },
                { id: "shipping", label: "Shipping & Returns" },
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
                      Detailed information about {section.label.toLowerCase()} will be displayed here. Designed with precision and minimal constraints to provide the optimal experience.
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
