/**
 * lib/chat-api.ts
 * ================
 * SSE stream consumer for the NexusAI FastAPI backend.
 * Connects to POST /chat and yields parsed events in real-time.
 */

// In development, the backend runs on localhost:8000.
// In production, set NEXT_PUBLIC_API_URL to your HuggingFace Spaces URL.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Product {
  product_name: string;
  sub_category: string;
  gender: string;
  price_usd: number;
  original_price_usd: number;
  rating: number;
  num_reviews: number;
  image_url: string;
  product_url: string;
}

export interface SSEEvent {
  type: "text_chunk" | "products" | "done" | "error";
  content?: string;
  products?: Product[];
  route?: string;
}

/**
 * Sends a chat message and returns a ReadableStream of SSE events.
 * The caller should iterate over events using an async for loop.
 */
export async function streamChat(
  message: string,
  chatHistory: ChatMessage[]
): Promise<ReadableStream<SSEEvent>> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      chat_history: chatHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<SSEEvent>({
    async pull(controller) {
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // keep incomplete last chunk

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6)) as SSEEvent;
            controller.enqueue(json);

            if (json.type === "done" || json.type === "error") {
              controller.close();
              return;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    },
  });
}

/**
 * Helper to consume the SSE stream with callbacks.
 * This is the main function used by the ChatWidget component.
 */
export async function sendMessage(
  message: string,
  chatHistory: ChatMessage[],
  onTextChunk: (chunk: string) => void,
  onProducts: (products: Product[]) => void,
  onDone: (route: string) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const stream = await streamChat(message, chatHistory);
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      switch (value.type) {
        case "text_chunk":
          onTextChunk(value.content || "");
          break;
        case "products":
          onProducts(value.products || []);
          break;
        case "done":
          onDone(value.route || "UNKNOWN");
          break;
        case "error":
          onError(value.content || "An unexpected error occurred.");
          break;
      }
    }
  } catch (err) {
    onError(
      err instanceof Error
        ? `Connection error: ${err.message}`
        : "Failed to connect to the AI backend."
    );
  }
}
