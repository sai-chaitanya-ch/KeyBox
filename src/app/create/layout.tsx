import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create KeyBox — Share Temporary Text, Code & Files",
  description:
    "Create a self-destructing, secure container protected by a 6-digit key. Choose your expiration time and share instantly.",
  alternates: {
    canonical: "/create",
  },
  openGraph: {
    title: "Create KeyBox — Share Temporary Text, Code & Files",
    description:
      "Create a self-destructing, secure container protected by a 6-digit key.",
    url: "/create",
  },
};

export default function CreateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}