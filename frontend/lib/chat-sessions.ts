/**
 * lib/chat-sessions.ts
 * ====================
 * Frontend-only chat session manager: types, in-memory helpers, and safe
 * localStorage persistence.
 *
 * This module is intentionally free of React and network concerns so it can be
 * unit-tested in isolation. All storage access is guarded and never throws:
 * missing, unreadable or corrupted data always degrades to an empty list.
 */

import type { Product } from "./chat-api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageStatus = "streaming" | "done" | "error" | "cancelled";

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  route?: string;
  /** Kept for backwards compatibility with sessions saved before `status`. */
  isStreaming?: boolean;
  status?: MessageStatus;
  /** Human-readable failure reason, only set when status is "error". */
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "nexusai.chat.sessions.v1";
export const DEFAULT_TITLE = "New chat";
export const MAX_TITLE_LENGTH = 40;

// ── Ids ───────────────────────────────────────────────────────────────────────

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Titles ────────────────────────────────────────────────────────────────────

/**
 * Builds a short session title from the first user message:
 * collapses whitespace, trims, and truncates with an ellipsis.
 */
export function deriveTitle(
  text: string,
  maxLength: number = MAX_TITLE_LENGTH
): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return DEFAULT_TITLE;
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}…`;
}

// ── Time ──────────────────────────────────────────────────────────────────────

export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now()
): string {
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── Construction & ordering ───────────────────────────────────────────────────

export function createSession(now: number = Date.now()): ChatSession {
  return {
    id: createId(),
    title: DEFAULT_TITLE,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Returns a new array sorted by most recently updated first. */
export function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Validation (defensive against corrupted storage) ──────────────────────────

function isMessageStatus(value: unknown): value is MessageStatus {
  return (
    value === "streaming" ||
    value === "done" ||
    value === "error" ||
    value === "cancelled"
  );
}

/**
 * Restores a persisted message status. A stream that was interrupted by a
 * reload or a closed tab is reported as "cancelled" rather than left spinning,
 * and sessions saved before `status` existed fall back to `isStreaming`.
 */
function normalizeStatus(
  rawStatus: unknown,
  rawIsStreaming: unknown
): MessageStatus {
  if (isMessageStatus(rawStatus)) {
    return rawStatus === "streaming" ? "cancelled" : rawStatus;
  }
  if (rawIsStreaming === true) return "cancelled";
  return "done";
}

function sanitizeMessage(value: unknown): UIMessage | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (typeof m.id !== "string" || m.id.length === 0) return null;
  if (m.role !== "user" && m.role !== "assistant") return null;
  if (typeof m.content !== "string") return null;

  const message: UIMessage = {
    id: m.id,
    role: m.role,
    content: m.content,
    // A session restored from storage is never mid-stream.
    isStreaming: false,
    status: normalizeStatus(m.status, m.isStreaming),
  };
  if (Array.isArray(m.products)) message.products = m.products as Product[];
  if (typeof m.route === "string") message.route = m.route;
  if (typeof m.error === "string") message.error = m.error;
  return message;
}

function sanitizeSession(value: unknown): ChatSession | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id.length === 0) return null;

  const messages = Array.isArray(s.messages)
    ? s.messages
        .map(sanitizeMessage)
        .filter((m): m is UIMessage => m !== null)
    : [];

  const createdAt =
    typeof s.createdAt === "number" && Number.isFinite(s.createdAt)
      ? s.createdAt
      : Date.now();
  const updatedAt =
    typeof s.updatedAt === "number" && Number.isFinite(s.updatedAt)
      ? s.updatedAt
      : createdAt;

  const title =
    typeof s.title === "string" && s.title.trim().length > 0
      ? s.title
      : deriveTitle(messages.find((m) => m.role === "user")?.content ?? "");

  return { id: s.id, title, messages, createdAt, updatedAt };
}

/** Parses an arbitrary JSON value into a list of valid sessions. */
export function parseSessions(raw: string | null): ChatSession[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(sanitizeSession)
    .filter((s): s is ChatSession => s !== null);
}

// ── Persistence ───────────────────────────────────────────────────────────────

/** Reads and validates persisted sessions. Never throws. */
export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    return parseSessions(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage blocked (e.g. disabled cookies/private mode).
    return [];
  }
}

/** Persists sessions. Never throws; storage-quota errors are ignored. */
export function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage unavailable or full — the app keeps working in memory.
  }
}

// ── Products ──────────────────────────────────────────────────────────────────

/**
 * Appends products in arrival order, dropping duplicates (the backend may emit
 * the same product on several events, and a retry must not double the cards).
 */
export function mergeProducts(
  existing: Product[] | undefined,
  incoming: Product[]
): Product[] {
  const seen = new Set<string>();
  const merged: Product[] = [];

  for (const product of [...(existing ?? []), ...incoming]) {
    if (!product || typeof product !== "object") continue;
    const key = product.product_url || `${product.product_name}|${product.price_usd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
  }

  return merged;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SessionMatch {
  session: ChatSession;
  /** First matching excerpt from message text, or null for a title-only match. */
  snippet: string | null;
  matchCount: number;
}

const SNIPPET_RADIUS = 45;

function buildSnippet(text: string, index: number, length: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  // Re-locate the match in the flattened string: collapsing whitespace shifts
  // offsets, so searching again keeps the snippet centred correctly.
  const needle = text.slice(index, index + length).replace(/\s+/g, " ").trim();
  const at = needle ? flat.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  const center = at === -1 ? 0 : at;
  const start = Math.max(0, center - SNIPPET_RADIUS);
  const end = Math.min(flat.length, center + needle.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < flat.length ? "…" : "";
  return `${prefix}${flat.slice(start, end)}${suffix}`;
}

/**
 * Case-insensitive search over session titles and every message body.
 * Returns matches ordered by most recently updated. An empty query returns all
 * sessions (with no snippet) so callers can use one list for both states.
 */
export function searchSessions(
  sessions: ChatSession[],
  query: string
): SessionMatch[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return sortSessions(sessions).map((session) => ({
      session,
      snippet: null,
      matchCount: 0,
    }));
  }

  const matches: SessionMatch[] = [];

  for (const session of sessions) {
    let matchCount = 0;
    let snippet: string | null = null;

    if (session.title.toLowerCase().includes(needle)) matchCount += 1;

    for (const message of session.messages) {
      const index = message.content.toLowerCase().indexOf(needle);
      if (index === -1) continue;
      matchCount += 1;
      if (snippet === null && message.content.trim()) {
        snippet = buildSnippet(message.content, index, needle.length);
      }
    }

    if (matchCount > 0) matches.push({ session, snippet, matchCount });
  }

  return matches.sort((a, b) => b.session.updatedAt - a.session.updatedAt);
}

// ── Export ────────────────────────────────────────────────────────────────────

function routeLabel(route: string): string {
  if (route === "SALES") return "Sales Agent";
  if (route === "SUPPORT") return "Support Agent";
  return "General";
}

/** Serialises a conversation as portable Markdown. */
export function sessionToMarkdown(session: ChatSession): string {
  const lines: string[] = [];
  lines.push(`# ${session.title}`, "");
  lines.push(`_Exported from NexusAI on ${new Date().toISOString()}_`, "");
  lines.push("---", "");

  if (session.messages.length === 0) {
    lines.push("_This conversation has no messages._", "");
  }

  for (const message of session.messages) {
    lines.push(message.role === "user" ? "### You" : "### NexusAI", "");
    if (message.content.trim()) lines.push(message.content.trim(), "");

    if (message.products && message.products.length > 0) {
      lines.push("**Products**", "");
      for (const product of message.products) {
        const price = `$${product.price_usd}`;
        const name = product.product_name || "Product";
        const link = product.product_url ? `[${name}](${product.product_url})` : name;
        const meta = [price, `★ ${product.rating}`, `${product.num_reviews} reviews`]
          .filter(Boolean)
          .join(" · ");
        lines.push(`- ${link} — ${meta}`);
      }
      lines.push("");
    }

    if (message.route && message.status !== "streaming") {
      lines.push(`_${routeLabel(message.route)}_`, "");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

/** Serialises a conversation as JSON for re-import or tooling. */
export function sessionToJSON(session: ChatSession): string {
  return JSON.stringify(
    {
      app: "NexusAI",
      format: "chat-session",
      version: 1,
      exportedAt: new Date().toISOString(),
      session,
    },
    null,
    2
  );
}

/** A filesystem-safe filename derived from the session title. */
export function exportFileName(
  session: ChatSession,
  extension: "md" | "json"
): string {
  const slug = session.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `nexusai-${slug || "chat"}.${extension}`;
}
