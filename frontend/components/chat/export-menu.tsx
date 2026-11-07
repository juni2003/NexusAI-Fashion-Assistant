"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, ChevronDown, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadTextFile } from "@/lib/download";
import {
  exportFileName,
  sessionToJSON,
  sessionToMarkdown,
  type ChatSession,
} from "@/lib/chat-sessions";

interface ExportMenuProps {
  session: ChatSession | undefined;
}

export function ExportMenu({ session }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMessages = !!session && session.messages.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleExport = (format: "md" | "json") => {
    if (!session) return;
    if (format === "md") {
      downloadTextFile(
        exportFileName(session, "md"),
        sessionToMarkdown(session),
        "text/markdown"
      );
    } else {
      downloadTextFile(
        exportFileName(session, "json"),
        sessionToJSON(session),
        "application/json"
      );
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={!hasMessages}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs transition-colors",
          hasMessages
            ? "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            : "cursor-not-allowed bg-white/5 text-slate-600"
        )}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Export conversation"
          className="glass-strong absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("md")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <FileText className="h-4 w-4 text-violet-400" />
            Markdown (.md)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("json")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Braces className="h-4 w-4 text-indigo-400" />
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  );
}
