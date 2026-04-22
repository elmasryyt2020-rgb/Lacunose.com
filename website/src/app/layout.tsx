import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lacunose — Discover Research Gaps in 3 Minutes",
  description:
    "AI-powered research gap analysis. Lacunose reads 1,500 abstracts and surfaces novel gaps backed by evidence — so you don't have to.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Lacunose — Discover Research Gaps in 3 Minutes",
    description:
      "AI-powered research gap analysis. Lacunose reads 1,500 abstracts and surfaces novel gaps backed by evidence.",
    type: "website",
    url: "https://lacunose.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
