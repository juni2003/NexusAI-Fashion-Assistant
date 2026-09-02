# ── Stage 1: Use a slim Python base ──────────────────────────────────────────
FROM python:3.11-slim

# HuggingFace Spaces runs as a non-root user for security.
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

# ── Stage 2: Install dependencies ─────────────────────────────────────────────
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Copy application code ────────────────────────────────────────────
COPY --chown=user . .

# ── Stage 4: Expose port and launch ──────────────────────────────────────────
# HuggingFace Spaces Docker apps MUST listen on port 7860.
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
