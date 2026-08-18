import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KeyBox — Share. Lock. Unlock.",
  description: "Share temporary text, URL, or code containers with a simple 6-digit access key. Anonymous and secure.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-[#fafafa] dark:bg-[#09090b] text-[#18181b] dark:text-[#f4f4f5] font-sans transition-colors duration-200`}
      >
        {children}
      </body>
    </html>
  );
}
