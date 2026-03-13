import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechBits | Digital Collectibles",
  description: "A premium digital collectible mystery box.",
};

import CustomCursor from "@/components/CustomCursor";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black text-white min-h-screen selection:bg-white/30 selection:text-white overflow-hidden cursor-none`}>
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
