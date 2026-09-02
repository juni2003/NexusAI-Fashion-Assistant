import requests
import json
import sys

def chat_with_bot():
    print("======================================================")
    print("🤖 NexusAI Terminal Chat (Press Ctrl+C to exit)")
    print("======================================================")
    
    url = "http://127.0.0.1:8000/chat"
    chat_history = []
    
    while True:
        try:
            # Get user input
            user_msg = input("\n🧑 You: ")
            if not user_msg.strip():
                continue
            
            # Send request to backend
            payload = {
                "message": user_msg,
                "chat_history": chat_history
            }
            
            print("🤖 NexusAI: ", end="", flush=True)
            
            # Call the streaming endpoint
            response = requests.post(url, json=payload, stream=True)
            
            if response.status_code != 200:
                print(f"\n[Error: {response.status_code} - {response.text}]")
                continue

            bot_reply = ""
            
            # Process Server-Sent Events (SSE) stream
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data: "):
                        data_str = decoded_line[6:]
                        try:
                            data = json.loads(data_str)
                            
                            # Handle text chunks (streaming letters/words)
                            if data.get("type") == "text_chunk":
                                chunk = data.get("content", "")
                                bot_reply += chunk
                                print(chunk, end="", flush=True)
                            
                            # Handle product cards
                            elif data.get("type") == "products":
                                products = data.get("products", [])
                                print("\n\n📦 [PRODUCT CARDS UI WOULD SHOW THESE]:")
                                for i, p in enumerate(products, 1):
                                    print(f"  {i}. {p['product_name']}")
                                    print(f"     Price: ${p['price_usd']} | Rating: {p['rating']}⭐")
                                    print(f"     Link: {p['product_url']}")
                            
                            # Handle end of stream
                            elif data.get("type") == "done":
                                route = data.get("route")
                                print(f"\n\n[Route taken: {route}]")
                                
                            elif data.get("type") == "error":
                                error_msg = data.get("content", "Unknown error")
                                print(f"\n\n[Backend Error: {error_msg}]")
                                
                        except json.JSONDecodeError:
                            pass
            
            # Add to memory for the next question
            chat_history.append({"role": "user", "content": user_msg})
            chat_history.append({"role": "assistant", "content": bot_reply})
            
            # Keep only the last 6 messages to prevent context overflow
            if len(chat_history) > 6:
                chat_history = chat_history[-6:]
                
        except KeyboardInterrupt:
            print("\n\nExiting chat. Goodbye!")
            sys.exit(0)
        except Exception as e:
            print(f"\n[Connection Error: Is the backend running? {e}]")

if __name__ == "__main__":
    chat_with_bot()
