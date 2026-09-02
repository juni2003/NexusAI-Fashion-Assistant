import type { Metadata } from "next";
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
  title: {
    template: "%s | NexusAI",
    default: "NexusAI — Your AI-Powered Style Assistant",
  },
  description:
    "NexusAI is an intelligent fashion shopping assistant that helps you discover the perfect outfit, get instant style advice, and navigate store policies — all powered by cutting-edge AI.",
  keywords: [
    "AI chatbot",
    "fashion assistant",
    "shopping AI",
    "style advisor",
    "NexusAI",
  ],
  openGraph: {
    title: "NexusAI — Your AI-Powered Style Assistant",
    description:
      "Discover your perfect style with NexusAI. Smart recommendations, instant support, powered by AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
