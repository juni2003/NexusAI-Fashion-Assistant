import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Assistant",
  description:
    "Chat with the NexusAI fashion assistant to discover products, find the perfect outfit, and get answers to store policies instantly.",
  openGraph: {
    title: "Chat Assistant | NexusAI",
    description:
      "Chat with the NexusAI fashion assistant to discover products, find the perfect outfit, and get answers to store policies instantly.",
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
