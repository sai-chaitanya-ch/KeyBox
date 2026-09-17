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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://keyboxx.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "KeyBox — Anonymous & Secure Temporary Content Sharing",
    template: "%s | KeyBox",
  },
  description:
    "Share temporary encrypted text, code snippets, links, and documents protected with a 6-digit access key. No accounts, self-destructing, and zero-knowledge.",
  keywords: [
    "temporary text share",
    "secure pastebin alternative",
    "self destructing notes",
    "encrypted code share",
    "anonymous text transfer",
    "6 digit pin share",
    "ephemeral file sharing",
  ],
  authors: [{ name: "KeyBox" }],
  creator: "KeyBox",
  publisher: "KeyBox",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "KeyBox",
    title: "KeyBox — Anonymous & Secure Temporary Content Sharing",
    description:
      "Share temporary encrypted text, code, links, and documents protected with a 6-digit access key. 100% anonymous & self-destructing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyBox — Share. Lock. Unlock.",
    description:
      "Share temporary encrypted text, code snippets, and files with a 6-digit key.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "KeyBox",
    url: BASE_URL,
    applicationCategory: "UtilityApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "A fast, anonymous, self-destructing content sharing tool. Lock text, code, links, and files behind a temporary 6-digit access key.",
    featureList: [
      "No registration or sign up required",
      "Auto-expiring temporary storage",
      "6-digit access key protection",
      "Support for plain text, code snippets, URLs, and files",
    ],
  };

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-[#fafafa] dark:bg-[#09090b] text-[#18181b] dark:text-[#f4f4f5] font-sans transition-colors duration-200`}
      >
        {children}
      </body>
    </html>
  );
}