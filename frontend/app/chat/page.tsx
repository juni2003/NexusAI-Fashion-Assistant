"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ExportMenu } from "@/components/chat/export-menu";
import { cn } from "@/lib/utils";
import { sendMessage, type ChatMessage, type Product } from "@/lib/chat-api";
import {
  createId,
  createSession,
  deriveTitle,
  loadSessions,
  mergeProducts,
  saveSessions,
  sortSessions,
  type ChatSession,
  type MessageStatus,
  type UIMessage,
} from "@/lib/chat-sessions";
import {
  AlertCircle,
  ArrowUpIcon,
  ArrowLeft,
  Menu,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Square,
  Undo2,
  DollarSign,
  Shirt,
  Star,
  ExternalLink,
  Loader2,
} from "lucide-react";

// Stable reference reused when there is no active session (keeps effect deps stable).
const EMPTY_MESSAGES: UIMessage[] = [];

// Long conversations render in windows so the DOM stays small.
const INITIAL_WINDOW = 30;
const WINDOW_STEP = 30;

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

// ── Streaming text animation ──────────────────────────────────────────────────
// Animates only while a response is streaming: once it settles the full text is
// rendered at once, so restored or long histories do no per-frame work.
function TypewriterEffect({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState(isStreaming ? "" : text);
  const targetTextRef = useRef(text);

  useEffect(() => {
    targetTextRef.current = text;
    // Catch up immediately when the stream ends (or for restored messages).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isStreaming) setDisplayedText(text);
  }, [text, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return undefined;
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const target = targetTextRef.current;
        if (prev.length >= target.length) return prev;
        const remaining = target.length - prev.length;
        return target.slice(0, prev.length + (remaining > 30 ? 2 : 1));
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const showCursor = !!isStreaming || displayedText.length < text.length;

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
      {showCursor && <span className="typing-cursor ml-1" />}
    </div>
  );
}

// ── Thinking indicator ────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="NexusAI is thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

// ── Message Bubble Component ──────────────────────────────────────────────────
interface MessageBubbleProps {
  message: UIMessage;
  onRetry: (messageId: string) => void;
  retryDisabled?: boolean;
}

function messageStatus(message: UIMessage): MessageStatus {
  if (message.status) return message.status;
  return message.isStreaming ? "streaming" : "done";
}

const MessageBubble = memo(function MessageBubble({
  message,
  onRetry,
  retryDisabled,
}: MessageBubbleProps) {
  const status = messageStatus(message);
  const isStreaming = status === "streaming";
  const isError = status === "error";
  const isCancelled = status === "cancelled";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "max-w-[85%] sm:max-w-[75%] px-5 py-3.5",
        message.role === "user"
          ? "message-user self-end text-white"
          : "message-ai self-start text-slate-200",
        isError && "ring-1 ring-red-500/30"
      )}
    >
      {/* Text Content */}
      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
        {message.role === "assistant" ? (
          message.content ? (
            <TypewriterEffect text={message.content} isStreaming={isStreaming} />
          ) : isStreaming ? (
            <ThinkingDots />
          ) : null
        ) : (
          message.content
        )}
      </div>

      {/* Failure state with retry */}
      {isError && (
        <div
          role="alert"
          className="mt-2 flex flex-col gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error || "The response failed. Please try again."}
          </span>
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            disabled={retryDisabled}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-100 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Cancelled state with retry */}
      {isCancelled && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">
            {message.content ? "Response stopped." : "No response was received."}
          </span>
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            disabled={retryDisabled}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Product Cards (Sales route) */}
      {message.products && message.products.length > 0 && (
        <div className="mt-4 -mx-1 flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {message.products.map((product, i) => (
            <ProductCard key={`${product.product_url || product.product_name}-${i}`} product={product} />
          ))}
        </div>
      )}

      {/* Route Badge */}
      {message.route && !isStreaming && (
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
});

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<typeof ALL_QUESTIONS>([]);
  // Ids of sessions with a request currently in flight (may outlive the view).
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_WINDOW);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // In-flight requests keyed by the session they belong to, so a stream keeps
  // running (and stays cancellable) when the user opens another chat.
  const activeRequestsRef = useRef<Map<string, AbortController>>(new Map());
  const { textareaRef, adjustHeight } = useAutoResizeTextarea(48, 150);

  const activeSession = sessions.find((s) => s.id === activeId);
  const messages = activeSession?.messages ?? EMPTY_MESSAGES;
  const isLoading = activeId ? streamingIds.has(activeId) : false;
  const isAnyStreaming = streamingIds.size > 0;

  // Hydrate sessions from localStorage on mount (never during SSR).
  // Reading browser-only storage must happen after mount to avoid a server/
  // client hydration mismatch, so the state update has to live in this effect.
  useEffect(() => {
    const stored = loadSessions();
    const initial = stored.length > 0 ? sortSessions(stored) : [createSession()];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(initial);
    setActiveId(initial[0].id);
    setHydrated(true);
  }, []);

  // Persist whenever the sessions change (after hydration).
  useEffect(() => {
    if (hydrated) saveSessions(sessions);
  }, [sessions, hydrated]);

  // Pick 6 random questions on load
  useEffect(() => {
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    // Random selection must not run during SSR, so it happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestedQuestions(shuffled.slice(0, 6));
  }, []);

  // Auto-scroll to bottom. During streaming use an instant jump so the smooth
  // animation is not restarted on every chunk.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isLoading ? "auto" : "smooth",
    });
  }, [messages, activeId, isLoading]);

  // Jump back to the tail when the visible conversation changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(INITIAL_WINDOW);
  }, [activeId]);

  // Cancel every in-flight request if the page unmounts.
  useEffect(() => {
    const requests = activeRequestsRef.current;
    return () => {
      for (const controller of requests.values()) controller.abort();
      requests.clear();
    };
  }, []);

  // Update the messages of one specific session (used by streaming callbacks).
  const patchSession = useCallback(
    (id: string, fn: (msgs: UIMessage[]) => UIMessage[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, messages: fn(s.messages), updatedAt: Date.now() }
            : s
        )
      );
    },
    []
  );

  // Build chat history for the API: completed turns only, oldest ones dropped.
  const buildChatHistory = (list: UIMessage[]): ChatMessage[] =>
    list
      .filter(
        (m) =>
          m.content.trim().length > 0 &&
          !m.isStreaming &&
          m.status !== "streaming" &&
          m.status !== "error"
      )
      .slice(-10) // last 5 turns
      .map((m) => ({ role: m.role, content: m.content }));

  // Track which sessions currently have a request in flight.
  const setStreaming = useCallback((id: string, busy: boolean) => {
    setStreamingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // ── Session manager actions ───────────────────────────────────────────────
  const handleNewChat = () => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleRenameSession = (id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: clean } : s))
    );
  };

  const handleDeleteSession = (id: string) => {
    // Stop a stream running in this session so it cannot resurrect the chat.
    const inFlight = activeRequestsRef.current.get(id);
    if (inFlight) {
      inFlight.abort();
      activeRequestsRef.current.delete(id);
      setStreaming(id, false);
    }

    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      // Always keep one session so there is something to chat in.
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      return;
    }
    setSessions(remaining);
    if (id === activeId) setActiveId(sortSessions(remaining)[0].id);
  };

  /**
   * Runs one assistant response for `sessionId` into the bubble `messageId`.
   * Every callback patches the originating session by id, so switching chats
   * while a response streams can never write into the wrong conversation.
   */
  const runStream = useCallback(
    async (
      sessionId: string,
      messageId: string,
      messageText: string,
      history: ChatMessage[]
    ) => {
      const controller = new AbortController();
      activeRequestsRef.current.set(sessionId, controller);
      setStreaming(sessionId, true);

      try {
        await sendMessage(
          messageText,
          history,
          // onTextChunk
          (chunk) => {
            patchSession(sessionId, (msgs) =>
              msgs.map((m) =>
                m.id === messageId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          // onProducts — merge so a retry never duplicates cards
          (products) => {
            patchSession(sessionId, (msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, products: mergeProducts(m.products, products) }
                  : m
              )
            );
          },
          // onDone
          (route) => {
            patchSession(sessionId, (msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, isStreaming: false, status: "done", route }
                  : m
              )
            );
          },
          // onError
          (error) => {
            patchSession(sessionId, (msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, isStreaming: false, status: "error", error }
                  : m
              )
            );
          },
          { signal: controller.signal }
        );
      } finally {
        if (activeRequestsRef.current.get(sessionId) === controller) {
          activeRequestsRef.current.delete(sessionId);
        }
        // An abort produces no callback, so settle the bubble here — unless a
        // later callback already finished it.
        if (controller.signal.aborted) {
          patchSession(sessionId, (msgs) =>
            msgs.map((m) =>
              m.id === messageId &&
              (m.status === "streaming" || m.isStreaming)
                ? { ...m, isStreaming: false, status: "cancelled" }
                : m
            )
          );
        }
        setStreaming(sessionId, false);
      }
    },
    [patchSession, setStreaming]
  );

  // Handle sending a new message
  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading || !activeId) return;

    const sessionId = activeId;
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const userMsg: UIMessage = {
      id: createId(),
      role: "user",
      content: messageText,
      status: "done",
    };
    const aiMsgId = createId();
    const aiMsg: UIMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
      status: "streaming",
    };

    const isFirstUserMessage = !session.messages.some((m) => m.role === "user");
    const history = buildChatHistory(session.messages);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              title: isFirstUserMessage ? deriveTitle(messageText) : s.title,
              messages: [...s.messages, userMsg, aiMsg],
              updatedAt: Date.now(),
            }
          : s
      )
    );
    setInput("");
    adjustHeight(true);

    await runStream(sessionId, aiMsgId, messageText, history);
  };

  /**
   * Retry a failed or cancelled turn in place. An assistant bubble re-sends its
   * preceding user message; nothing is appended, so no message or product is
   * duplicated.
   */
  const handleRetry = useCallback(
    (messageId: string) => {
      const sessionId = activeId;
      if (!sessionId || streamingIds.has(sessionId)) return;
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const index = session.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const target = session.messages[index];

      if (target.role === "assistant") {
        let userIndex = index - 1;
        while (userIndex >= 0 && session.messages[userIndex].role !== "user") {
          userIndex -= 1;
        }
        if (userIndex < 0) return;

        const userText = session.messages[userIndex].content;
        const history = buildChatHistory(session.messages.slice(0, userIndex));

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === target.id
                      ? {
                          ...m,
                          content: "",
                          products: undefined,
                          route: undefined,
                          error: undefined,
                          isStreaming: true,
                          status: "streaming",
                        }
                      : m
                  ),
                  updatedAt: Date.now(),
                }
              : s
          )
        );

        void runStream(sessionId, target.id, userText, history);
        return;
      }

      // A failed user message is resent as a fresh turn.
      const history = buildChatHistory(session.messages.slice(0, index));
      const aiMsgId = createId();
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: aiMsgId,
                    role: "assistant",
                    content: "",
                    isStreaming: true,
                    status: "streaming",
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        )
      );

      void runStream(sessionId, aiMsgId, target.content, history);
    },
    [activeId, sessions, streamingIds, runStream]
  );

  // Cancel the active session's response.
  const handleStop = useCallback(() => {
    if (activeId) activeRequestsRef.current.get(activeId)?.abort();
  }, [activeId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  // Only the newest messages are mounted; older ones load on demand.
  const hiddenCount = Math.max(0, messages.length - visibleCount);
  const visibleMessages = hiddenCount > 0 ? messages.slice(hiddenCount) : messages;

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>

      {/* Session sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelect={handleSelectSession}
        onRename={handleRenameSession}
        onDelete={handleDeleteSession}
        streamingIds={streamingIds}
      />

      {/* Main column */}
      <div className="flex h-screen min-w-0 flex-1 flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong px-6 py-4 flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chat history"
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors md:hidden"
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
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
                {isLoading
                  ? "Responding…"
                  : isAnyStreaming
                    ? "Responding in another chat…"
                    : "Online"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
          )}
          <ExportMenu session={activeSession} />
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

          {/* Older messages are loaded on demand to keep the DOM small. */}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + WINDOW_STEP)}
              className="mx-auto rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Show {Math.min(hiddenCount, WINDOW_STEP)} earlier message
              {Math.min(hiddenCount, WINDOW_STEP) === 1 ? "" : "s"} ({hiddenCount} hidden)
            </button>
          )}

          {/* Message Bubbles */}
          {visibleMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={handleRetry}
              retryDisabled={isAnyStreaming}
            />
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
                {isLoading
                  ? "AI is responding…"
                  : "Press Enter to send · Shift+Enter for a new line"}
              </p>
              {isLoading ? (
                <Button
                  onClick={handleStop}
                  aria-label="Stop response"
                  className="flex items-center rounded-xl bg-white/10 px-4 py-2 text-white transition-all duration-300 hover:bg-white/20"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span className="ml-2 text-xs">Stop</span>
                </Button>
              ) : (
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={cn(
                    "rounded-xl px-4 py-2 transition-all duration-300",
                    input.trim()
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20"
                      : "bg-white/5 text-slate-500 cursor-not-allowed"
                  )}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}
