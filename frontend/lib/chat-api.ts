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
 * Parses a single complete SSE event block (already split on the blank line
 * delimiter) into an SSEEvent. Returns null for comments/heartbeats or
 * malformed payloads. Multiple `data:` lines are joined with newlines, as the
 * SSE spec requires.
 */
function parseEvent(rawEvent: string): SSEEvent | null {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (dataLines.length === 0) return null;

  try {
    return JSON.parse(dataLines.join("\n")) as SSEEvent;
  } catch {
    return null;
  }
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

  // Persists for the lifetime of the stream so an event split across two
  // network reads is reassembled instead of being lost.
  let buffer = "";

  const enqueueEvent = (
    controller: ReadableStreamDefaultController<SSEEvent>,
    event: SSEEvent | null
  ): boolean => {
    if (!event) return false;
    controller.enqueue(event);
    return event.type === "done" || event.type === "error";
  };

  const flushBuffer = (
    controller: ReadableStreamDefaultController<SSEEvent>
  ): void => {
    // Decoder flush: emit any multi-byte character held back at the boundary.
    buffer += decoder.decode();
    const finalEvent = parseEvent(buffer);
    buffer = "";
    enqueueEvent(controller, finalEvent);
    controller.close();
  };

  return new ReadableStream<SSEEvent>({
    async pull(controller) {
      while (true) {
        // Parse every complete event currently sitting in the buffer. Events
        // are delimited by a blank line (\n\n, tolerating \r\n\r\n). Anything
        // after the last delimiter is incomplete and stays buffered.
        const boundary = buffer.match(/\r?\n\r?\n/);
        if (boundary && boundary.index !== undefined) {
          const rawEvent = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);

          if (enqueueEvent(controller, parseEvent(rawEvent))) {
            controller.close();
            return;
          }
          continue;
        }

        const { done, value } = await reader.read();

        if (done) {
          flushBuffer(controller);
          return;
        }

        buffer += decoder.decode(value, { stream: true });
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
