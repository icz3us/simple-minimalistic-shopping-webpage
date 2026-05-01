"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function BackgroundEffects() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Delay showing the video to match the intro typing animation gracefully
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500); 

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const updateOpacity = () => {
      if (video) {
        const duration = video.duration || 0;
        const currentTime = video.currentTime;
        
        if (duration > 0) {
          const fadeInDuration = 0.5;
          const fadeOutDuration = 0.5;

          if (currentTime < fadeInDuration) {
            video.style.opacity = (currentTime / fadeInDuration).toString();
          } else if (currentTime > duration - fadeOutDuration) {
            video.style.opacity = Math.max(0, (duration - currentTime) / fadeOutDuration).toString();
          } else {
            video.style.opacity = "1";
          }
        }
      }
      animationFrameId = requestAnimationFrame(updateOpacity);
    };

    const handlePlay = () => {
      animationFrameId = requestAnimationFrame(updateOpacity);
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(console.error);
        }
      }, 100);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);
    
    // Initial requestAnimationFrame loop in case play event was missed
    animationFrameId = requestAnimationFrame(updateOpacity);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoaded]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="w-full h-full relative"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0 }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />

        {/* Content (z-10) */}
        <div className="relative z-10 flex flex-col items-center pt-16 pb-24 px-4 gap-20">
          {/* A h-40 spacer div for video visibility */}
          <div className="h-40 w-full" />
        </div>
      </motion.div>
    </div>
  );
}
