# Curl commands to test authentication and session issues
# Run this with a Bash shell or WSL

# Set this to the username and password you want to test
USERNAME="admin"
PASSWORD="admin"

echo ""
echo "========================================================"
echo " TESTING SESSION BEFORE LOGIN"
echo "========================================================"
echo ""

# Get a session and CSRF token
SESSION_RESPONSE=$(curl -s -c cookie_jar.txt http://127.0.0.1:8000/api/debug-session/)
echo "Session response: $SESSION_RESPONSE"

# Extract CSRF token
CSRF_TOKEN=$(grep -oP 'csrftoken\s+\K\S+' cookie_jar.txt)
echo "CSRF Token: $CSRF_TOKEN"

echo ""
echo "========================================================"
echo " TESTING LOGIN WITH USER: $USERNAME"
echo "========================================================"
echo ""

# Login with credentials
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "X-CSRFToken: $CSRF_TOKEN" \
    -b cookie_jar.txt \
    -c cookie_jar.txt \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
    http://127.0.0.1:8000/api/login/)
    
echo "Login response: $LOGIN_RESPONSE"

# Show cookie jar
echo ""
echo "Cookies after login:"
cat cookie_jar.txt

echo ""
echo "========================================================"
echo " TESTING SESSION AFTER LOGIN"
echo "========================================================"
echo ""

# Check session again after login
SESSION_RESPONSE=$(curl -s -b cookie_jar.txt http://127.0.0.1:8000/api/debug-session/)
echo "Session response after login: $SESSION_RESPONSE"

echo ""
echo "========================================================"
echo " RUNNING HEADERS TEST ON WEBSOCKET ENDPOINT"
echo "========================================================"
echo ""

# Test WebSocket headers (this won't establish a WebSocket connection, just check headers)
SESSION_ID=$(grep -oP 'sessionid\s+\K\S+' cookie_jar.txt)
echo "Session ID: $SESSION_ID"

curl -s -I \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Cookie: csrftoken=$CSRF_TOKEN; sessionid=$SESSION_ID" \
    "http://127.0.0.1:8000/ws/game/?session=$SESSION_ID"

echo ""
echo "DONE! Use ws_debug.py for actual WebSocket testing"