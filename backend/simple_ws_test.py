import asyncio
import websockets
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# WebSocket URL to connect to
WS_URL = "ws://127.0.0.1:8000/ws/game/"

# Add Origin header to match the allowed origins in Django settings
HEADERS = {
    "Origin": "http://localhost:5173",
    "User-Agent": "Mozilla/5.0"
}

async def test_websocket_connection():
    """Simple script to test WebSocket connection."""
    logging.info(f"Connecting to WebSocket at {WS_URL}")
    logging.info(f"Using headers: {HEADERS}")
    
    try:
        # Connect to the WebSocket server with the Origin header
        # Use additional_headers (changed from extra_headers to match websockets API)
        async with websockets.connect(WS_URL, additional_headers=HEADERS) as websocket:
            logging.info("Connected to WebSocket server!")
            
            # Wait for initial message
            logging.info("Waiting for initial message from server...")
            response = await websocket.recv()
            response_data = json.loads(response)
            logging.info(f"Initial message received: {json.dumps(response_data, indent=2)}")
            
            # Log whether username was received
            if 'username' in response_data:
                if response_data['username']:
                    logging.info(f"Authenticated as: {response_data['username']}")
                else:
                    logging.warning("Connected anonymously (no username)")
            else:
                logging.warning("No username field in response")
            
            # Send a ping message
            logging.info("Sending ping message...")
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Wait for pong response
            pong_response = await websocket.recv()
            pong_data = json.loads(pong_response)
            logging.info(f"Received response: {json.dumps(pong_data, indent=2)}")
            
            # Test game interaction
            logging.info("Sending test move (right)...")
            await websocket.send(json.dumps({"type": "move", "direction": "right"}))
            
            # Wait for move response
            move_response = await websocket.recv()
            move_data = json.loads(move_response)
            logging.info(f"Move response received: {json.dumps(move_data, indent=2)}")
            
            # Check again for username in the move response
            if 'username' in move_data:
                if move_data['username']:
                    logging.info(f"Move confirmed for user: {move_data['username']}")
                else:
                    logging.warning("Move processed anonymously (no username)")
            
            logging.info("WebSocket test completed successfully!")
            
    except Exception as e:
        logging.error(f"Error during WebSocket test: {str(e)}")

# Run the test
if __name__ == "__main__":
    asyncio.run(test_websocket_connection())