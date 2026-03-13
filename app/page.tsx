"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundEffects from "@/components/BackgroundEffects";
import ProductShowcase from "@/components/ProductShowcase";
import CreditsModal from "@/components/CreditsModal";

export default function Home() {
  const [typedText, setTypedText] = useState("");
  const [introState, setIntroState] = useState<"typing" | "sliding" | "done">("typing");
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const fullText = "By ICON IGOP";

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

  const showMainUI = introState !== "typing";

  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-hidden">

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
              <div className="flex items-center gap-4">
                <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] uppercase text-white/90">
                  SAMPLE FRONTEND
                </h1>
              </div>

              <div className="text-sm md:text-lg font-light text-white/50 tracking-[0.4em] uppercase h-8 flex items-center">
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
        <nav className="absolute top-0 w-full p-6 sm:p-10 z-20 flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto cursor-pointer">
            <span className="text-sm tracking-[0.3em] font-light uppercase">SAMPLE SHOPPING FRONT</span>
          </div>

          <div className="flex items-center gap-6 text-xs tracking-widest font-light text-white/50 pointer-events-auto">
            <button className="hover:text-white transition-colors">SUPPORT</button>
            <button
              className="hover:text-white transition-colors"
              onClick={() => setIsCreditsOpen(true)}
            >
              CREDITS
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 w-full h-full">
          <ProductShowcase />
        </div>

        {/* Footer / Corner Info */}
        <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 z-20 text-xs tracking-[0.2em] font-light text-white/30 pointer-events-none">
          [ SYSTEM ONLINE - V1.0 ]
        </div>
      </motion.div>

      <AnimatePresence>
        {isCreditsOpen && (
          <CreditsModal
            isOpen={isCreditsOpen}
            onClose={() => setIsCreditsOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
