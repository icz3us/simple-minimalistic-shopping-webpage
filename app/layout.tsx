import type { Metadata } from "next";
import "./globals.css";

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
      <body className="font-sans antialiased bg-black text-white min-h-screen selection:bg-white/30 selection:text-white overflow-x-hidden cursor-none">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
