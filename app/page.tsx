"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ShoppingCart, UserCircle } from "lucide-react";
import BackgroundEffects from "@/components/BackgroundEffects";
import ProductShowcase from "@/components/ProductShowcase";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [typedText, setTypedText] = useState("");
  const [introState, setIntroState] = useState<"typing" | "sliding" | "done">("typing");
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

  const showMainUI = introState === "sliding" || introState === "done";

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

        <Navbar absolute={true} />

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
