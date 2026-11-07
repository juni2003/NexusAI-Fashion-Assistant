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

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  route?: string;
  isStreaming?: boolean;
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
  };
  if (Array.isArray(m.products)) message.products = m.products as Product[];
  if (typeof m.route === "string") message.route = m.route;
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
