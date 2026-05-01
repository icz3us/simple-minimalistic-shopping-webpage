"use client";

import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";

import Navbar from "@/components/Navbar";

export default function TechShell({
  children,
  title,
  subtitle,
}: {
  children?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-x-hidden">
      <BackgroundEffects />
      <div className="relative z-10 min-h-screen bg-black/45">
        <Navbar />

        <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-10">
          <div className="mb-6 border-b border-white/10 pb-5 sm:mb-8 sm:pb-6">
            <p className="mb-3 text-[10px] uppercase tracking-[0.34em] text-white/35 sm:text-[11px] sm:tracking-[0.4em]">System Access</p>
            <h1 className="text-2xl font-light tracking-tight text-white sm:text-4xl lg:text-5xl">{title}</h1>
            {subtitle && <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-white/55 sm:mt-4">{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
