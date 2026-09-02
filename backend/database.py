# -*- coding: utf-8 -*-
"""
backend/database.py
====================
All Supabase interactions live here.
- Initialises the Supabase client once (singleton pattern)
- Exposes two search functions called by graph.py:
    search_products(query_embedding)  -> list of product dicts
    search_support(query_embedding)   -> list of support doc dicts
"""

import os
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# ── Singleton: Supabase client ────────────────────────────────────────────────
_supabase_client: Client | None = None

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _supabase_client = create_client(url, key)
    return _supabase_client


# ── Singleton: Embedding model ────────────────────────────────────────────────
# Loaded once at startup — same model used during ingestion, so vectors are compatible.
_embed_model: SentenceTransformer | None = None

def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


# ── Public API ────────────────────────────────────────────────────────────────

def embed_query(text: str) -> list[float]:
    """Convert a user query string into a 384-dim vector."""
    model = get_embed_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def search_products(query_embedding: list[float], top_k: int = 15) -> list[dict]:
    """
    Calls the match_products Postgres function via Supabase RPC.
    Returns up to top_k products ordered by cosine similarity.
    """
    client = get_supabase()
    response = client.rpc(
        "match_products",
        {"query_embedding": query_embedding, "match_count": top_k}
    ).execute()

    return response.data if response.data else []


def search_support(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    Calls the match_support_docs Postgres function via Supabase RPC.
    Returns up to top_k support document chunks ordered by cosine similarity.
    """
    client = get_supabase()
    response = client.rpc(
        "match_support_docs",
        {"query_embedding": query_embedding, "match_count": top_k}
    ).execute()

    return response.data if response.data else []
