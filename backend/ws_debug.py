"""
WebSocket and Authentication Diagnostic Tool
This script tests both HTTP authentication and WebSocket connections
to diagnose issues with the 2048 game application.
"""

import requests
import asyncio
import websockets
import json
import sys
from urllib.parse import quote
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_URL = f"{BASE_URL}/api"
WS_URL = "ws://127.0.0.1:8000/ws/game/"
USERNAME = "admin"  # Change this to match your test user
PASSWORD = "admin"  # Change this to match your test user

def print_header(message):
    print("\n" + "="*60)
    print(f" {message} ")
    print("="*60)

def print_response(resp):
    print(f"Status: {resp.status_code}")
    print(f"Headers: {dict(resp.headers)}")
    print("Cookies:", resp.cookies.get_dict())
    try:
        print("Response:", resp.json())
    except:
        print("Response (text):", resp.text[:200] + ("..." if len(resp.text) > 200 else ""))

async def test_websocket(cookies):
    """Test WebSocket connection with provided cookies"""
    print_header("TESTING WEBSOCKET CONNECTION")
    
    # Format cookies for WebSocket header
    cookie_header = "; ".join([f"{k}={v}" for k, v in cookies.items()])
    
    # Generate a connection ID
    connection_id = f"test_{int(time.time())}"
    session_id = cookies.get("sessionid", "anonymous")
    
    # Build the WebSocket URL with query parameters
    ws_url = f"{WS_URL}?id={connection_id}&session={quote(session_id)}"
    
    print(f"Connecting to: {ws_url}")
    print(f"With cookies: {cookie_header}")
    
    try:
        async with websockets.connect(
            ws_url,
            extra_headers={"Cookie": cookie_header}
        ) as websocket:
            print("✅ WebSocket connection established!")
            
            # Wait for initial state message
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            print(f"Initial state received: {json.dumps(data, indent=2)}")
            
            # Check for username in response
            if data.get("username"):
                print(f"✅ Username detected in WebSocket response: {data['username']}")
            else:
                print("❌ No username in WebSocket response")
            
            # Send a move command
            print("Sending test move...")
            await websocket.send(json.dumps({"type": "move", "direction": "up"}))
            move_response = await asyncio.wait_for(websocket.recv(), timeout=5)
            move_data = json.loads(move_response)
            print(f"Move response received: {json.dumps(move_data, indent=2)}")
            
            return True
            
    except Exception as e:
        print(f"❌ WebSocket error: {type(e).__name__}: {str(e)}")
        return False

def test_login():
    """Test login API and get session cookies"""
    print_header("TESTING LOGIN API")
    
    session = requests.Session()
    
    # Step 1: Get initial CSRF token
    print("Step 1: Getting CSRF token...")
    try:
        resp = session.get(f"{API_URL}/debug-session/")
        print_response(resp)
        cookies = session.cookies.get_dict()
    except Exception as e:
        print(f"Error getting CSRF token: {e}")
        return None
    
    # Step 2: Login with credentials
    print("\nStep 2: Logging in...")
    try:
        login_data = {"username": USERNAME, "password": PASSWORD}
        resp = session.post(f"{API_URL}/login/", json=login_data)
        print_response(resp)
        cookies = session.cookies.get_dict()
        
        if resp.status_code == 200 and resp.json().get("success", False):
            print("✅ Login successful!")
        else:
            print("❌ Login failed!")
    except Exception as e:
        print(f"Error logging in: {e}")
        return None
    
    # Step 3: Verify session
    print("\nStep 3: Verifying session...")
    try:
        resp = session.get(f"{API_URL}/debug-session/")
        print_response(resp)
        
        session_data = resp.json()
        if session_data.get("is_authenticated", False):
            print("✅ Session is authenticated!")
            print(f"✅ User: {session_data.get('username')}")
        else:
            print("❌ Session is not authenticated!")
    except Exception as e:
        print(f"Error verifying session: {e}")
    
    return cookies

async def main():
    # Test login and get cookies
    cookies = test_login()
    
    if not cookies:
        print("❌ Failed to get authentication cookies")
        return
    
    # Test WebSocket with the authenticated cookies
    success = await test_websocket(cookies)
    
    if success:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n❌ Tests failed - see above for details")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Script error: {e}")
        sys.exit(1)