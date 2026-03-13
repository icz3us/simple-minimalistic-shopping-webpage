"use client";

import { motion } from "framer-motion";
import Spline from '@splinetool/react-spline';
import { useState, useEffect } from "react";

export default function BackgroundEffects() {
  const [loadSpline, setLoadSpline] = useState(false);

  useEffect(() => {
    // Delay loading the heavy WebGL Spline scene to ensure the intro typing
    // and sliding animations remain completely smooth.
    const timer = setTimeout(() => {
      setLoadSpline(true);
    }, 3800); // Wait until the entire intro is totally finished

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loadSpline ? 1 : 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="w-full h-full"
        >
          {loadSpline && (
            <Spline
              scene="https://prod.spline.design/r-EoGOyGH9PmqDgN/scene.splinecode"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
