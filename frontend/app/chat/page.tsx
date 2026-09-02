"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendMessage, type ChatMessage, type Product } from "@/lib/chat-api";
import {
  ArrowUpIcon,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Undo2,
  DollarSign,
  Shirt,
  Star,
  ExternalLink,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  route?: string;
  isStreaming?: boolean;
}

// ── Auto-resize hook ──────────────────────────────────────────────────────────
function useAutoResizeTextarea(minHeight: number, maxHeight: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

// ── Questions Pool ─────────────────────────────────────────────────────────────
const ALL_QUESTIONS = [
  // Sales (Based on NexusWear Dataset)
  { icon: <Shirt className="w-4 h-4" />, label: "Find Men's Shirts", prompt: "Show me some men's formal shirts under $20." },
  { icon: <Sparkles className="w-4 h-4" />, label: "Women's Wear", prompt: "Suggest some comfortable women's western wear." },
  { icon: <DollarSign className="w-4 h-4" />, label: "Cheap Shirts", prompt: "What are the cheapest men's shirts you have?" },
  { icon: <Star className="w-4 h-4" />, label: "Top Rated", prompt: "Can you find me top-rated men's shirts?" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Premium Tops", prompt: "Show me premium women's tops with good ratings." },
  { icon: <Shirt className="w-4 h-4" />, label: "Slim Fit", prompt: "Find me some men's slim fit shirts." },
  { icon: <Sparkles className="w-4 h-4" />, label: "Floral Print", prompt: "I need a floral print top for a summer vacation." },
  { icon: <DollarSign className="w-4 h-4" />, label: "Under $15", prompt: "Show me clothes under 15 dollars." },

  // Support (Based on store_policies.md)
  { icon: <Undo2 className="w-4 h-4" />, label: "Return Policy", prompt: "What is your return policy?" },
  { icon: <Undo2 className="w-4 h-4" />, label: "Returns for Fit", prompt: "Can I return an item if it doesn't fit?" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Canada Shipping", prompt: "How long does shipping take to Canada?" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Free Shipping", prompt: "Do you offer free shipping?" },
  { icon: <DollarSign className="w-4 h-4" />, label: "Payment Methods", prompt: "What payment methods do you accept?" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "International", prompt: "Do you ship internationally?" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Track Order", prompt: "How do I track my order?" },

  // General
  { icon: <Sparkles className="w-4 h-4" />, label: "Specialty", prompt: "What kind of clothing do you specialize in?" },
  { icon: <Shirt className="w-4 h-4" />, label: "Wardrobe Help", prompt: "Can you help me build a smart casual wardrobe?" },
  { icon: <Sparkles className="w-4 h-4" />, label: "How it works", prompt: "How does this AI fashion assistant work?" },
];

// ── Product Card Component ────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  return (
    <motion.a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group glass rounded-xl overflow-hidden card-lift block min-w-[220px] max-w-[260px] flex-shrink-0"
    >
      <div className="relative h-48 overflow-hidden bg-slate-800/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/image?url=${encodeURIComponent(product.image_url)}`}
          alt={product.product_name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Only try the fallback once
            if (!target.dataset.failed) {
              target.dataset.failed = "true";
              target.src = product.image_url;
            } else {
              target.style.display = "none";
              target.parentElement!.classList.add("flex", "items-center", "justify-center");
              const fallback = document.createElement("div");
              fallback.className = "flex flex-col items-center gap-2 text-slate-500";
              fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">Image unavailable</span>';
              target.parentElement!.appendChild(fallback);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 glass rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-white font-medium">
            {product.rating}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-white text-sm font-medium line-clamp-2 leading-snug">
          {product.product_name}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-violet-400 font-bold text-lg">
              ${product.price_usd}
            </span>
            {product.original_price_usd > product.price_usd && (
              <span className="text-slate-500 text-xs line-through">
                ${product.original_price_usd}
              </span>
            )}
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
        </div>
        <p className="text-slate-500 text-xs">
          {product.sub_category} · {product.gender}
        </p>
      </div>
    </motion.a>
  );
}

// ── Typewriter Effect ─────────────────────────────────────────────────────────
function TypewriterEffect({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [displayedText, setDisplayedText] = useState("");
  const targetTextRef = useRef(text);

  useEffect(() => {
    targetTextRef.current = text;
  }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const target = targetTextRef.current;
        if (prev.length < target.length) {
          // Realistic typing speed: max 2 chars per tick
          const remaining = target.length - prev.length;
          const step = remaining > 30 ? 2 : 1;
          return target.slice(0, prev.length + step);
        }
        return prev;
      });
    }, 25); // Slower interval to ensure the typing is noticeable

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
          li: ({ node, ...props }) => <li {...props} />,
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {(isStreaming || displayedText.length < text.length) && (
        <span className="typing-cursor ml-1" />
      )}
    </div>
  );
}

// ── Message Bubble Component ──────────────────────────────────────────────────
function MessageBubble({ message }: { message: UIMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "max-w-[85%] sm:max-w-[75%] px-5 py-3.5",
        message.role === "user"
          ? "message-user self-end text-white"
          : "message-ai self-start text-slate-200"
      )}
    >
      {/* Text Content */}
      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
        {message.role === "assistant" ? (
          <TypewriterEffect text={message.content} isStreaming={message.isStreaming} />
        ) : (
          message.content
        )}
      </div>

      {/* Product Cards (Sales route) */}
      {message.products && message.products.length > 0 && (
        <div className="mt-4 -mx-1 flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {message.products.map((product, i) => (
            <ProductCard key={i} product={product} />
          ))}
        </div>
      )}

      {/* Route Badge */}
      {message.route && !message.isStreaming && (
        <div className="mt-3 flex items-center gap-1.5">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              message.route === "SALES"
                ? "bg-emerald-400"
                : message.route === "SUPPORT"
                  ? "bg-blue-400"
                  : "bg-amber-400"
            )}
          />
          <span className="text-xs text-slate-500">
            {message.route === "SALES"
              ? "Sales Agent"
              : message.route === "SUPPORT"
                ? "Support Agent"
                : "General"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<typeof ALL_QUESTIONS>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea(48, 150);

  // Pick 6 random questions on load
  useEffect(() => {
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    setSuggestedQuestions(shuffled.slice(0, 6));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build chat history for API
  const buildChatHistory = (): ChatMessage[] => {
    return messages
      .filter((m) => !m.isStreaming)
      .slice(-10) // last 5 turns
      .map((m) => ({ role: m.role, content: m.content }));
  };

  // Handle sending a message
  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: UIMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    adjustHeight(true);
    setIsLoading(true);

    const chatHistory = buildChatHistory();

    await sendMessage(
      messageText,
      chatHistory,
      // onTextChunk
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      // onProducts
      (products) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, products } : m))
        );
      },
      // onDone
      (route) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false, route } : m
          )
        );
        setIsLoading(false);
      },
      // onError
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: `⚠️ ${error}`, isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative w-full h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong px-6 py-4 flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">NexusAI</h1>
              <p className="text-slate-400 text-xs">
                {isLoading ? "Thinking..." : "Online"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          )}
        </div>
      </motion.header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto py-6 flex flex-col gap-4">
          {/* Empty State */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center pt-[15vh]"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 glow-purple">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">
                  What can I help you find?
                </h2>
                <p className="text-slate-400 text-center max-w-md mb-8">
                  Ask me about fashion products, store policies, or anything
                  style-related. I&apos;m your personal shopping assistant!
                </p>

                {/* Suggested Questions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                  {suggestedQuestions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      onClick={() => handleSend(action.prompt)}
                      className="flex items-start justify-start gap-3 h-auto p-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300 group"
                    >
                      <div className="mt-0.5 text-violet-400 group-hover:text-violet-300 transition-colors shrink-0">
                        {action.icon}
                      </div>
                      <span className="text-sm text-slate-300 group-hover:text-white text-left font-normal leading-snug whitespace-normal">
                        {action.prompt}
                      </span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Bubbles */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 sm:px-6 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="relative glass-strong rounded-2xl">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask NexusAI anything about fashion..."
              disabled={isLoading}
              className={cn(
                "w-full px-5 py-4 resize-none border-none",
                "bg-transparent text-white text-sm",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-slate-500 min-h-[48px]",
                "disabled:opacity-50"
              )}
              style={{ overflow: "hidden" }}
            />

            <div className="flex items-center justify-between px-4 pb-3">
              <p className="text-slate-600 text-xs">
                {isLoading ? "AI is responding..." : "Press Enter to send"}
              </p>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "rounded-xl px-4 py-2 transition-all duration-300",
                  input.trim() && !isLoading
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20"
                    : "bg-white/5 text-slate-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
