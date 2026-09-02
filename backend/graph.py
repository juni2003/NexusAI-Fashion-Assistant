# -*- coding: utf-8 -*-
"""
backend/graph.py
=================
The core intelligence of NexusAI — a LangGraph stateful agent.

Graph structure:
    [START]
      |
      v
    [router]          -- Groq LLM classifies intent: SALES | SUPPORT | OUT_OF_SCOPE
      |
      +-- SALES -------> [sales_node]      -- Vector search + FlashRank + Groq response
      |
      +-- SUPPORT -----> [support_node]    -- Vector search + Groq response
      |
      +-- OUT_OF_SCOPE -> [oob_node]       -- Polite redirect
      |
    [END]

The graph returns a dict with:
    "text"     : str            -- The AI's response (streamed by main.py)
    "products" : list[dict]     -- (Sales only) top 3 product objects for card UI
    "route"    : str            -- Which route was taken
"""

import os
import json
from typing import TypedDict, Annotated
from groq import Groq
from langgraph.graph import StateGraph, END
from flashrank import Ranker, RerankRequest
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv

from database import embed_query, search_products, search_support

load_dotenv()

# ── Clients ───────────────────────────────────────────────────────────────────
_groq_client: Groq | None = None

def get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY must be set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client

# FlashRank — lightweight local reranker, no API key needed
_ranker: Ranker | None = None

def get_ranker() -> Ranker:
    global _ranker
    if _ranker is None:
        _ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2")
    return _ranker


# ── LangGraph State ───────────────────────────────────────────────────────────
class AgentState(TypedDict):
    user_message: str
    chat_history: list[dict]    # [{"role": "user"|"assistant", "content": str}, ...]
    intent:       str           # "SALES" | "SUPPORT" | "OUT_OF_SCOPE"
    text:         str           # Final text response to stream
    products:     list[dict]    # Product cards (Sales route only)
    route:        str           # Which node handled the request


# ── Helper: call Groq with retry on rate limit ───────────────────────────────
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def call_groq(messages: list[dict], temperature: float = 0.3) -> str:
    client = get_groq()
    response = client.chat.completions.create(
        model="groq/compound-mini",
        messages=messages,
        temperature=temperature,
        max_tokens=1024,
    )
    return response.choices[0].message.content


# ── Node 1: Router ────────────────────────────────────────────────────────────
def router_node(state: AgentState) -> AgentState:
    """
    Classifies the user's message into one of three intents.
    Uses a tight, structured prompt to ensure reliable classification.
    """
    system_prompt = """You are an intent classifier for NexusAI, a fashion e-commerce store.
Classify the user's message into EXACTLY ONE of these three labels:

SALES        - User is looking for products, wants recommendations, asking about items,
               searching for clothing, asking about styles/colors/sizes/prices.
               Examples: "suggest yellow shirts", "I want a jacket under $20", "show me dresses"

SUPPORT      - User is asking about store policies, shipping, returns, payment, sizing guides,
               order tracking, or any operational store question.
               Examples: "how do I return an item?", "when will my order arrive?", "do you accept PayPal?"

OUT_OF_SCOPE - The message is unrelated to shopping or store policies.
               Examples: "who won the World Cup?", "write me a poem", "what is AI?"

Reply with ONLY the label — no explanation, no punctuation. Just the word: SALES, SUPPORT, or OUT_OF_SCOPE"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": state["user_message"]}
    ]

    intent = call_groq(messages, temperature=0.0).strip().upper()

    # Defensive fallback — if model goes off-script, default to SALES
    if intent not in ("SALES", "SUPPORT", "OUT_OF_SCOPE"):
        intent = "SALES"

    return {**state, "intent": intent}


# ── Node 2: Sales ─────────────────────────────────────────────────────────────
def sales_node(state: AgentState) -> AgentState:
    """
    1. Embeds the user query
    2. Searches Supabase for top 15 candidate products
    3. Reranks with FlashRank → picks top 3
    4. Calls Groq to generate a natural-language sales response
    5. Returns both the text response AND the structured product list
    """
    query = state["user_message"]

    # Step 1: Vector search — get top 15 candidates
    query_vec = embed_query(query)
    candidates = search_products(query_vec, top_k=15)

    if not candidates:
        return {
            **state,
            "route": "SALES",
            "text": "I couldn't find products matching your request right now. Could you try rephrasing, or tell me more about what you're looking for?",
            "products": [],
        }

    # Step 2: FlashRank reranking — reduce 15 → top 3
    ranker = get_ranker()
    passages = [
        {"id": i, "text": f"{p['product_name']} - {p['gender']} - ${p['price_usd']} - {p['sub_category']}"}
        for i, p in enumerate(candidates)
    ]
    rerank_request = RerankRequest(query=query, passages=passages)
    reranked = ranker.rerank(rerank_request)

    # Take top 3 reranked results
    top_indices  = [r["id"] for r in reranked[:3]]
    top_products = [candidates[i] for i in top_indices]

    # Step 3: Build context for the LLM
    product_context = "\n\n".join([
        f"Product {idx + 1}:\n"
        f"  Name: {p['product_name']}\n"
        f"  Category: {p['sub_category']} | Gender: {p['gender']}\n"
        f"  Price: ${p['price_usd']} USD (was ${p['original_price_usd']})\n"
        f"  Rating: {p['rating']} stars ({p['num_reviews']} reviews)"
        for idx, p in enumerate(top_products)
    ])

    # Step 4: Build conversation history for memory
    history_messages = state.get("chat_history", [])[-8:]   # last 4 turns (user+assistant)

    system_prompt = """You are NexusAI, a friendly and knowledgeable fashion shopping assistant for an online clothing store.
Your personality: enthusiastic, helpful, concise. You speak like a real fashion-savvy sales associate — not a robot.

STRICT RULES:
- Recommend ONLY the products listed in the CONTEXT below. Do not invent any other products.
- Mention each product's name, price, and a brief reason why it suits the user's request.
- Keep your response to 3-4 sentences maximum. Be punchy and engaging.
- Do NOT use phrases like "As an AI" or "I'm a language model".
- End with a warm, encouraging line like "Want to see more options?" or "Would you like details on any of these?"

CONTEXT (Retrieved Products):
{context}"""

    messages = [
        {"role": "system", "content": system_prompt.format(context=product_context)},
        *history_messages,
        {"role": "user", "content": query}
    ]

    response_text = call_groq(messages)

    # Step 5: Build structured product list for frontend cards
    product_cards = [
        {
            "product_name":       p["product_name"],
            "sub_category":       p["sub_category"],
            "gender":             p["gender"],
            "price_usd":          p["price_usd"],
            "original_price_usd": p["original_price_usd"],
            "rating":             p["rating"],
            "num_reviews":        p["num_reviews"],
            "image_url":          p["image_url"],
            "product_url":        p["product_url"],
        }
        for p in top_products
    ]

    return {
        **state,
        "route":    "SALES",
        "text":     response_text,
        "products": product_cards,
    }


# ── Node 3: Support ───────────────────────────────────────────────────────────
def support_node(state: AgentState) -> AgentState:
    """
    1. Embeds the user query
    2. Searches Supabase support_docs for relevant policy chunks
    3. Calls Groq to answer using ONLY the retrieved context (strict RAG)
    """
    query = state["user_message"]

    # Step 1: Vector search against FAQ / policy docs
    query_vec = embed_query(query)
    docs = search_support(query_vec, top_k=4)

    if not docs:
        return {
            **state,
            "route": "SUPPORT",
            "text": "I wasn't able to find a specific answer to that in our store policies. Please contact our support team at support@nexusstore.com or use the live chat (Mon-Fri, 9AM-6PM EST).",
            "products": [],
        }

    # Build context from retrieved docs
    context = "\n\n---\n\n".join([d["content"] for d in docs])

    # Build conversation history
    history_messages = state.get("chat_history", [])[-8:]

    system_prompt = """You are NexusAI, a helpful customer support assistant for NexusStore, an online fashion retailer.

STRICT RULES:
- Answer ONLY using information from the STORE POLICIES below.
- If the answer is not in the policies, say: "I don't have that information. Please contact support@nexusstore.com."
- Be concise and friendly. 1-3 sentences is ideal.
- Do NOT make up policies, prices, dates, or contact details not in the context.

STORE POLICIES:
{context}"""

    messages = [
        {"role": "system", "content": system_prompt.format(context=context)},
        *history_messages,
        {"role": "user", "content": query}
    ]

    response_text = call_groq(messages)

    return {
        **state,
        "route":    "SUPPORT",
        "text":     response_text,
        "products": [],
    }


# ── Node 4: Out of Scope ──────────────────────────────────────────────────────
def oob_node(state: AgentState) -> AgentState:
    """Handles off-topic questions with a polite redirect."""
    return {
        **state,
        "route": "OUT_OF_SCOPE",
        "text": (
            "I'm NexusAI, your personal fashion shopping assistant! "
            "I'm best at helping you find the perfect outfit or answering questions about our store. "
            "What can I help you find today? Try asking me to suggest a shirt, or ask about our return policy!"
        ),
        "products": [],
    }


# ── Build & Compile the LangGraph ─────────────────────────────────────────────
def build_graph():
    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("router",  router_node)
    workflow.add_node("sales",   sales_node)
    workflow.add_node("support", support_node)
    workflow.add_node("oob",     oob_node)

    # Entry point
    workflow.set_entry_point("router")

    # Conditional routing based on intent
    workflow.add_conditional_edges(
        "router",
        lambda state: state["intent"],
        {
            "SALES":         "sales",
            "SUPPORT":       "support",
            "OUT_OF_SCOPE":  "oob",
        }
    )

    # All leaf nodes go to END
    workflow.add_edge("sales",   END)
    workflow.add_edge("support", END)
    workflow.add_edge("oob",     END)

    return workflow.compile()


# Compile once at module load — reused for every request
nexus_graph = build_graph()
