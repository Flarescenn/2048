import asyncio
import websockets
import json
import logging
import requests
import django
import os
import sys
from urllib.parse import urlencode

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import Django models
from django.contrib.auth.models import User

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Print versions for debugging
logging.info(f"Python version: {sys.version}")
logging.info(f"Django version: {django.__version__}")

# Base URLs
API_BASE = "http://127.0.0.1:8000/api"
WS_URL = "ws://127.0.0.1:8000/ws/game/"

async def test_auth_websocket():
    """Test the WebSocket connection with authentication."""
    
    # Step 1: Authenticate via HTTP to get session cookie
    logging.info("Step 1: Authenticating via HTTP...")
    session = requests.Session()
    
    # Get CSRF token
    logging.info("Getting CSRF token...")
    csrf_response = session.get(f"{API_BASE}/csrf/", 
                               headers={"Origin": "http://localhost:5173"})
    
    if csrf_response.status_code != 200:
        logging.error(f"CSRF request failed: {csrf_response.status_code}")
        return
        
    logging.info(f"CSRF cookies: {session.cookies.get_dict()}")
    csrf_token = session.cookies.get("csrftoken")
    
    if not csrf_token:
        logging.error("No CSRF token found!")
        return
    
    # Log in
    logging.info("Logging in as testuser...")
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    
    login_response = session.post(
        f"{API_BASE}/login/",
        json=login_data,
        headers={
            "Content-Type": "application/json",
            "X-CSRFToken": csrf_token,
            "Origin": "http://localhost:5173"
        }
    )
    
    if login_response.status_code != 200:
        logging.error(f"Login failed: {login_response.status_code}")
        logging.error(f"Response: {login_response.text}")
        return
    
    logging.info("Login successful!")
    logging.info(f"Login response: {login_response.text}")
    
    # Check cookies
    cookies = session.cookies.get_dict()
    logging.info(f"Cookies after login: {cookies}")
    
    sessionid = cookies.get("sessionid")
    if not sessionid:
        logging.error("No sessionid cookie found after login!")
        return
    
    # Get session info
    logging.info("Checking session status...")
    session_response = session.get(f"{API_BASE}/debug-session/", 
                                  headers={"Origin": "http://localhost:5173"})
    
    logging.info(f"Session info: {session_response.text}")
    
    # Step 2: Connect to WebSocket with the session cookie
    logging.info("\nStep 2: Connecting to WebSocket with auth cookies...")
    
    # Format cookies for websocket header
    cookie_header = f"sessionid={sessionid}; csrftoken={csrf_token}"
    headers = {
        "Cookie": cookie_header,
        "Origin": "http://localhost:5173",
        "User-Agent": "Mozilla/5.0"
    }
    
    # Add session ID as query param too for extra measure
    ws_url_with_session = f"{WS_URL}?{urlencode({'session': sessionid})}"
    logging.info(f"WebSocket URL: {ws_url_with_session}")
    logging.info(f"Cookie header: {cookie_header}")
    
    try:
        async with websockets.connect(ws_url_with_session, 
                                     additional_headers=headers) as websocket:
            logging.info("WebSocket connected!")
            
            # Wait for initial message
            logging.info("Waiting for initial message...")
            response = await websocket.recv()
            response_data = json.loads(response)
            logging.info(f"Initial message received: {json.dumps(response_data, indent=2)}")
            
            # Check username
            if response_data.get("username"):
                logging.info(f"SUCCESS! Authenticated as: {response_data.get('username')}")
            else:
                logging.warning("Still connected anonymously - no username in response")
            
            # Test with a move
            logging.info("Sending a test move...")
            await websocket.send(json.dumps({"type": "move", "direction": "right"}))
            
            move_response = await websocket.recv()
            move_data = json.loads(move_response)
            logging.info(f"Move response: {json.dumps(move_data, indent=2)}")
            
            # Check username in move response
            if move_data.get("username"):
                logging.info(f"Move processed as user: {move_data.get('username')}")
            else:
                logging.warning("Move processed anonymously - no username in response")
            
    except Exception as e:
        logging.error(f"WebSocket error: {str(e)}")

# Run the test
if __name__ == "__main__":
    # Create/update test user
    try:
        user = User.objects.filter(username='testuser').first()
        if not user:
            User.objects.create_user('testuser', 'test@example.com', 'password123')
            logging.info("Test user created: testuser/password123")
        else:
            # Reset password for existing user
            user.set_password('password123')
            user.save()
            logging.info("Reset password for existing test user")
    except Exception as e:
        logging.error(f"Error managing test user: {str(e)}")
        
    asyncio.run(test_auth_websocket())