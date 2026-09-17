import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open KeyBox — Unlock Shared Content",
  description:
    "Enter your 6-digit access key to decrypt and view temporary text, code snippets, URLs, or files before they expire.",
  alternates: {
    canonical: "/retrieve",
  },
  openGraph: {
    title: "Open KeyBox — Unlock Shared Content",
    description: "Enter your 6-digit access key to view temporary shared content.",
    url: "/retrieve",
  },
};

export default function RetrieveLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}