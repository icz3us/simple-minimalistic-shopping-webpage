"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassModal from "./GlassModal";

export default function ProductShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center">
      {/* Centered Product Element */}
      <div 
        className="relative z-10 cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        <motion.div
          animate={{
            y: [-15, 15, -15],
            rotateY: [0, 180, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96"
        >
          {/* Main Product Placeholder (A glowing TechBits Module) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-3xl border border-white/20 backdrop-blur-md shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden group-hover:border-white/40 group-hover:shadow-[0_0_120px_rgba(255,255,255,0.1)] transition-all duration-700">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-1/2 bg-white/5 rounded-full blur-2xl" />
            </div>
            {/* The "Brain" or "Core" of the bit */}
            <div className="absolute inset-1/4 rounded-2xl border border-white/30 bg-black/50 backdrop-blur-sm flex items-center justify-center overflow-hidden">
               <motion.div 
                 animate={{ scale: [1, 1.1, 1] }} 
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="w-16 h-16 rounded-full bg-white/80 blur-md"
               />
               <span className="absolute text-white/50 text-xs tracking-[0.3em] font-light z-10">T-BIT</span>
            </div>
          </div>
        </motion.div>
        
        {/* Subtle Indicator to Hover/Click */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isModalOpen ? 0 : 1 }}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-[0.2em] font-light pointer-events-none"
        >
          [ CLICK TO INSPECT ]
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <GlassModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
