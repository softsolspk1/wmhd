import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "World Mental Health Day 2026 - Official Banner Generator",
  description:
    "Everyone deserves good mental health. Personalize and download your official World Mental Health Day 2026 banner — 10th October 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-900`}>
        {children}
      </body>
    </html>
  );
}
