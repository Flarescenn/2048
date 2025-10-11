import os
import sys
import django
import json
import asyncio
import websockets
import requests
from urllib.parse import urlencode

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Now we can import Django models
from django.contrib.auth.models import User

# Print the Python and Django version for debugging
print(f"Python version: {sys.version}")
print(f"Django version: {django.__version__}")

async def test_auth_flow():
    print("=" * 80)
    print("WEBSOCKET AUTHENTICATION DEBUG")
    print("=" * 80)
    
    # Step 1: Create a session using HTTP to log in
    print("\n[1] Creating session with Django login...")
    
    # Constants
    BASE_URL = "http://127.0.0.1:8000"
    LOGIN_URL = f"{BASE_URL}/api/login/"
    SESSION_URL = f"{BASE_URL}/api/debug-session/"
    
    # Create a persistent session
    session = requests.Session()
    
    # First get CSRF token
    print("Getting CSRF token...")
    csrf_response = session.get(f"{BASE_URL}/api/csrf/")
    
    if csrf_response.status_code != 200:
        print(f"CSRF request failed with status {csrf_response.status_code}")
        return
        
    print("CSRF Response headers:", csrf_response.headers)
    print("CSRF Response cookies:", session.cookies.get_dict())
    
    # Check if we have the CSRF token in cookies
    csrf_token = session.cookies.get('csrftoken')
    if not csrf_token:
        print("ERROR: No CSRF token found in cookies!")
        return
    
    print(f"CSRF token: {csrf_token}")
    
    # Log in with test user (create this user in your database first)
    login_data = {
        'username': 'testuser',  # Change to your test username
        'password': 'password123'  # Change to your test password
    }
    
    print(f"\nLogging in as {login_data['username']}...")
    login_response = session.post(
        LOGIN_URL, 
        json=login_data,
        headers={
            'X-CSRFToken': csrf_token,
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:5173',  # Add origin header for CORS
            'Referer': 'http://localhost:5173/' # Add referer for additional validation
        }
    )
    
    if login_response.status_code != 200:
        print(f"Login failed with status {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    print("Login successful!")
    print("Login response:", login_response.json())
    print("Cookies after login:", session.cookies.get_dict())
    
    # Check session
    print("\n[2] Verifying session state...")
    session_response = session.get(SESSION_URL)
    session_data = session_response.json()
    
    print("Session data from /api/debug-session/:")
    print(json.dumps(session_data, indent=2))
    
    # Extract authentication details
    auth_user_id = session_data.get('auth_user_id_in_session')
    session_key = session_data.get('session_key')
    is_authenticated = session_data.get('is_authenticated', False)
    # Backwards compatibility for both field names
    if 'user_authenticated' in session_data:
        is_authenticated = session_data.get('user_authenticated', False) 
    username = session_data.get('username')
    
    print(f"\nAuthentication status: {'Authenticated' if is_authenticated else 'Not authenticated'}")
    print(f"Username: {username}")
    print(f"User ID in session: {auth_user_id}")
    print(f"Session key: {session_key}")
    
    if not is_authenticated:
        print("\nWARNING: User not authenticated in HTTP session!")
        return
    
    # Step 3: Connect to WebSocket with session cookie
    print("\n[3] Connecting to WebSocket with session cookies...")
    
    # Get cookies from the session
    cookie_dict = session.cookies.get_dict()
    cookie_header = "; ".join([f"{name}={value}" for name, value in cookie_dict.items()])
    
    print("Cookies being sent to WebSocket:")
    print(cookie_header)
    
    # Query parameters for the WebSocket connection
    ws_params = {
        'session': session_key,  # Pass session ID as query param
    }
    
    # WebSocket URL with query parameters
    ws_url = f"ws://127.0.0.1:8000/ws/game/?{urlencode(ws_params)}"
    print(f"Connecting to WebSocket URL: {ws_url}")
    
    try:
        # Connect to WebSocket with cookies
        async with websockets.connect(
            ws_url,
            extra_headers={"Cookie": cookie_header}
        ) as websocket:
            print("WebSocket connected!")
            
            # Wait for initial state message
            print("Waiting for initial state message...")
            response = await websocket.recv()
            response_data = json.loads(response)
            
            print("\nReceived initial message:")
            print(json.dumps(response_data, indent=2))
            
            # Check for username in the response
            if response_data.get('type') == 'init':
                username_ws = response_data.get('username')
                print(f"\nUsername from WebSocket: {username_ws}")
                
                if username_ws == username:
                    print("SUCCESS: Username in WebSocket matches HTTP session username!")
                else:
                    print("ERROR: Username mismatch or missing in WebSocket!")
                    print(f"HTTP Session username: {username}")
                    print(f"WebSocket username: {username_ws}")
            
            # Send a move command to test further interaction
            print("\nSending a test move command...")
            await websocket.send(json.dumps({"type": "move", "direction": "right"}))
            
            # Get response
            move_response = await websocket.recv()
            move_data = json.loads(move_response)
            
            print("\nReceived move response:")
            print(json.dumps(move_data, indent=2))
            
            print("\nWebSocket test completed!")
            
    except Exception as e:
        print(f"WebSocket connection error: {str(e)}")
        
    print("\n" + "=" * 80)
    print("TEST COMPLETED")
    print("=" * 80)

if __name__ == "__main__":
    # Create a test user if it doesn't exist
    try:
        user = User.objects.filter(username='testuser').first()
        if not user:
            User.objects.create_user('testuser', 'test@example.com', 'password123')
            print("Test user created: testuser/password123")
        else:
            # Reset password for existing user just in case
            user.set_password('password123')
            user.save()
            print("Reset password for existing test user")
    except Exception as e:
        print(f"Error managing test user: {str(e)}")
    
    # Run the async test
    asyncio.run(test_auth_flow())