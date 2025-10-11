"""
Simple WebSocket connection check - tries to connect to the local WebSocket server
and verify it's running properly.
"""
import asyncio
import socket
import sys

async def check_ws_server():
    print("\n" + "="*60)
    print("WebSocket Server Availability Check")
    print("="*60)
    
    # First check if port 8000 is open
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', 8000))
    
    if result != 0:
        print("✘ Port 8000 is CLOSED. The Django/Daphne server is not running.")
        print("\nPlease start the server with:")
        print("   python -m daphne core.asgi:application -b 127.0.0.1 -p 8000")
        sock.close()
        return False
        
    print("✓ Port 8000 is OPEN. Server appears to be running.")
    sock.close()
    
    # Try basic HTTP connection to verify Django is running
    try:
        import requests
        response = requests.get('http://127.0.0.1:8000/', timeout=2)
        print(f"✓ HTTP response: {response.status_code}")
    except Exception as e:
        print(f"✘ HTTP connection error: {e}")
    
    # Now try a WebSocket handshake without full implementation
    try:
        import websockets
        
        print("\nAttempting WebSocket connection...")
        uri = 'ws://127.0.0.1:8000/ws/game/?id=test&session=test'
        
        try:
            async with websockets.connect(uri, timeout=5) as ws:
                print("✓ WebSocket connection successful!")
                
                # Send a ping message
                await ws.send('{"type":"ping"}')
                print("  Sent: ping message")
                
                # Wait for response with timeout
                response = await asyncio.wait_for(ws.recv(), timeout=2)
                print(f"  Received: {response}")
                
                return True
        except websockets.exceptions.ConnectionClosed as e:
            print(f"✘ WebSocket closed unexpectedly: {e}")
        except Exception as e:
            print(f"✘ WebSocket connection error: {type(e).__name__}: {e}")
            
    except ImportError:
        print("✘ Cannot test WebSocket directly - 'websockets' package not installed.")
        print("  Try: pip install websockets")
    
    return False

if __name__ == "__main__":
    result = asyncio.run(check_ws_server())
    
    if result:
        print("\n✅ WebSocket server appears to be working correctly!")
        sys.exit(0)
    else:
        print("\n❌ WebSocket server has issues that need to be addressed.")
        sys.exit(1)