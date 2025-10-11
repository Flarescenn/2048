import websocket
import json
import time
import sys

def on_message(ws, message):
    print(f"Received message: {message}")
    data = json.loads(message)
    if data.get("type") == "init":
        print("Connection successful! Received initial game state.")
        print(f"Board: {data.get('board')}")
        print(f"Score: {data.get('score')}")
        print(f"Game Over: {data.get('over')}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"Connection closed: {close_status_code} - {close_msg}")

def on_open(ws):
    print("Connection opened")

if __name__ == "__main__":
    # WebSocket URL
    url = "ws://127.0.0.1:8000/ws/game/?id=test"
    
    # Create a WebSocket connection
    ws = websocket.WebSocketApp(url,
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)

    # Start the WebSocket connection
    ws.run_forever()