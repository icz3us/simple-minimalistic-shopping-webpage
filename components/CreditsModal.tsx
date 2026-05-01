"use client";

import { motion } from "framer-motion";
import { X, User, ExternalLink } from "lucide-react";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-20 pointer-events-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="relative w-full max-w-3xl glass-panel rounded-lg overflow-hidden pointer-events-auto flex flex-col bg-[#0a0a0a]/80"
      >
        {/* Glowing Background gradient within modal */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black pointer-events-none" />
        <div className="absolute -top-40 -left-60 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

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
        <div className="relative z-10 w-full flex flex-col items-center justify-center p-8 md:p-16 text-center">
          
          {/* Avatar Icon */}
          <motion.div 
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-full bg-white/5 border border-white/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
          >
            <User className="w-10 h-10 text-white/80" strokeWidth={1.5} />
          </motion.div>

          <h3 className="text-white/50 text-xs tracking-[0.4em] uppercase font-light mb-4">
            Creator & Lead Developer
          </h3>
          
          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-8">
            Gonzales, Icon Zeus R.
          </h2>

          <div className="max-w-xl space-y-4 mb-10">
            <p className="text-sm md:text-base font-light leading-relaxed text-white/60">
              Passionate full-stack developer specializing in creating immersive, high-performance web experiences. With a deep focus on design aesthetics and interactive 3D elements, this project serves as a testament to the intersection of code and art.
            </p>
            <p className="text-xs md:text-sm font-light text-white/40">
              Crafting strictly typed architectures while delivering silky smooth unconstrained animations.
            </p>
          </div>

          <a 
            href="https://profile-nextjs-nu.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-300 rounded-sm"
          >
            <span className="text-xs tracking-[0.2em] font-medium text-white/90 uppercase">
              View Portfolio
            </span>
            <ExternalLink className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            
            {/* Button corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30 group-hover:border-white/70 transition-colors" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30 group-hover:border-white/70 transition-colors" />
          </a>

        </div>
      </motion.div>
    </motion.div>
  );
}
