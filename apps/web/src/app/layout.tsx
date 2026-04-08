import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { Header } from "@/components/header";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Global Signals",
  description: "AI-powered market intelligence for beginner investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="font-[var(--font-body)]">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}

