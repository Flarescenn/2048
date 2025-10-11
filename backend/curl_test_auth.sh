#!/bin/bash
# WebSocket authentication test script with curl

echo "==============================================="
echo "WebSocket Authentication Test Script with curl"
echo "==============================================="

# Base URLs
API_BASE="http://127.0.0.1:8000/api"
WS_BASE="ws://127.0.0.1:8000/ws"

# Create a cookie jar file to store cookies between requests
COOKIE_JAR="websocket_cookies.txt"

# Clean any previous cookie jar
rm -f $COOKIE_JAR

echo -e "\n1. Getting CSRF token..."
curl -s -X GET "$API_BASE/csrf/" \
  -c $COOKIE_JAR \
  -H "Origin: http://localhost:5173" \
  -v

echo -e "\n2. Getting CSRF token from cookie jar:"
grep csrftoken $COOKIE_JAR

# Extract CSRF token from cookie jar
CSRF_TOKEN=$(grep csrftoken $COOKIE_JAR | awk '{print $7}')
echo "CSRF Token: $CSRF_TOKEN"

echo -e "\n3. Logging in with test user..."
curl -s -X POST "$API_BASE/login/" \
  -b $COOKIE_JAR \
  -c $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -H "Origin: http://localhost:5173" \
  -d '{"username":"testuser", "password":"password123"}' \
  -v

echo -e "\n4. Checking session status..."
curl -s -X GET "$API_BASE/debug-session/" \
  -b $COOKIE_JAR \
  -c $COOKIE_JAR \
  -H "Origin: http://localhost:5173" | python -m json.tool

echo -e "\n5. Cookie jar contents after login:"
cat $COOKIE_JAR

# Extract session ID from cookie jar
SESSION_ID=$(grep sessionid $COOKIE_JAR | awk '{print $7}')
echo -e "\nSession ID: $SESSION_ID"

echo -e "\nWebSocket testing would require a WebSocket client."
echo "Use a browser or the WebSocket client in the ws_session_debug.py script to test the WebSocket connection."
echo -e "\nCookies that should be sent to the WebSocket:"
echo "sessionid=$SESSION_ID"

echo -e "\nTo manually test in browser console:"
echo "const ws = new WebSocket('ws://127.0.0.1:8000/ws/game/');"
echo "ws.onmessage = (e) => console.log(JSON.parse(e.data));"
echo "ws.onopen = () => console.log('WebSocket open');"
echo "ws.onclose = (e) => console.log('WebSocket closed', e);"

echo -e "\nFor debugging, try the ws_session_debug.py script."
echo "==============================================="

# Cleanup
# rm -f $COOKIE_JAR  # Uncomment to remove the cookie jar