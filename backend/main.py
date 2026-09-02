# -*- coding: utf-8 -*-
"""
backend/main.py
================
FastAPI application — the entry point for NexusAI backend.

Endpoints:
    GET  /          → Health check
    GET  /healthz   → Health check (for HuggingFace Spaces)
    POST /chat      → Main SSE streaming chat endpoint

CORS is configured to allow requests from any origin during development.
Lock this down to your Vercel frontend URL in production.
"""

import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from graph import nexus_graph

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="NexusAI Backend",
    description="Intelligent fashion sales & support agent powered by LangGraph + Groq",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow all origins in development. In production, replace "*" with your Vercel URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str       # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message:      str
    chat_history: list[Message] = []    # Last N turns for conversation memory


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
@app.get("/healthz")
async def health_check():
    """Simple health check — used by HuggingFace Spaces to verify the app is running."""
    return {"status": "ok", "service": "NexusAI Backend"}


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint.
    
    Streams the AI's text response as Server-Sent Events (SSE).
    Also sends a final SSE event with the product cards (if Sales route).
    
    SSE format:
        data: {"type": "text_chunk", "content": "..."}   <- streamed tokens
        data: {"type": "products",   "products": [...]}  <- product cards (Sales only)
        data: {"type": "done",       "route": "SALES"}   <- signals stream end
    
    Frontend should read these events and:
        - Append text_chunk to the message bubble
        - Render the products array as product cards
        - Handle "done" to stop the loading indicator
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Convert Pydantic models to plain dicts for LangGraph state
    history = [{"role": m.role, "content": m.content} for m in request.chat_history]

    # Initial LangGraph state
    initial_state = {
        "user_message": request.message,
        "chat_history": history,
        "intent":       "",
        "text":         "",
        "products":     [],
        "route":        "",
    }

    async def event_stream():
        try:
            # Run the LangGraph agent (synchronous, but fast enough for SSE)
            result = nexus_graph.invoke(initial_state)

            text     = result.get("text", "")
            products = result.get("products", [])
            route    = result.get("route", "UNKNOWN")

            # ── Stream the text word-by-word for a typewriter effect ──────────
            # We simulate token streaming since Groq already returned the full response.
            # For true token streaming, use groq client with stream=True (future upgrade).
            words = text.split(" ")
            for i, word in enumerate(words):
                chunk = word if i == 0 else f" {word}"
                payload = json.dumps({"type": "text_chunk", "content": chunk})
                yield f"data: {payload}\n\n"

            # ── Send product cards (Sales route only) ─────────────────────────
            if products:
                payload = json.dumps({"type": "products", "products": products})
                yield f"data: {payload}\n\n"

            # ── Signal stream end ─────────────────────────────────────────────
            payload = json.dumps({"type": "done", "route": route})
            yield f"data: {payload}\n\n"

        except Exception as e:
            # Send error as SSE so frontend can display it gracefully
            payload = json.dumps({"type": "error", "content": f"An error occurred: {str(e)}"})
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",    # Prevents Nginx from buffering SSE
            "Access-Control-Allow-Origin": "*",
        }
    )
