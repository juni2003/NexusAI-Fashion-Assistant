"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  sortSessions,
  type ChatSession,
} from "@/lib/chat-sessions";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({
  sessions,
  activeId,
  open,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const ordered = sortSessions(sessions);

  // Focus/select the inline rename field as soon as it appears.
  useEffect(() => {
    if (editingId) renameInputRef.current?.select();
  }, [editingId]);

  // Close the delete confirmation with Escape.
  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingDelete(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete]);

  const startRename = (session: ChatSession) => {
    setEditingId(session.id);
    setDraftTitle(session.title);
  };

  const commitRename = () => {
    if (editingId) {
      const clean = draftTitle.trim();
      if (clean) onRename(editingId, clean);
    }
    setEditingId(null);
  };

  const cancelRename = () => setEditingId(null);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        aria-label="Chat sessions"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col",
          "border-r border-white/10 bg-[#0d0d1a]/85 backdrop-blur-xl",
          "transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand + close */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Chats</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New chat */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all duration-300 hover:from-violet-500 hover:to-indigo-500"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {ordered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-slate-500">
              No conversations yet.
            </p>
          )}

          {ordered.map((session) => {
            const isActive = session.id === activeId;
            const isEditing = session.id === editingId;

            return (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  isActive
                    ? "border-violet-500/30 bg-white/10"
                    : "border-transparent hover:bg-white/5"
                )}
              >
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      ref={renameInputRef}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      onBlur={commitRename}
                      maxLength={80}
                      autoFocus
                      className="min-w-0 flex-1 rounded-md border border-violet-500/40 bg-black/30 px-2 py-1 text-sm text-white outline-none focus:border-violet-400"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={commitRename}
                      aria-label="Save title"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-400 hover:bg-white/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      onDoubleClick={() => startRename(session)}
                      title={session.title}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                    >
                      <span
                        className={cn(
                          "w-full truncate text-sm",
                          isActive ? "text-white" : "text-slate-300"
                        )}
                      >
                        {session.title}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                    </button>

                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-0.5 transition-opacity",
                        isActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => startRename(session)}
                        aria-label={`Rename ${session.title}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(session)}
                        aria-label={`Delete ${session.title}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Delete confirmation */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setPendingDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              className="glass-strong w-full max-w-sm rounded-2xl p-6"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3
                id="delete-dialog-title"
                className="mb-1 text-base font-semibold text-white"
              >
                Delete chat?
              </h3>
              <p className="mb-5 text-sm text-slate-400">
                <span className="text-slate-200">
                  &ldquo;{pendingDelete.title}&rdquo;
                </span>{" "}
                will be permanently deleted. This can&apos;t be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(pendingDelete.id);
                    setPendingDelete(null);
                  }}
                  className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
