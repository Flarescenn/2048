# WebSocket Authentication Test Script with PowerShell

Write-Host "==============================================="
Write-Host "WebSocket Authentication Test Script with PowerShell"
Write-Host "==============================================="

# Base URLs
$API_BASE="http://127.0.0.1:8000/api"
$WS_BASE="ws://127.0.0.1:8000/ws"

# Create a session to store cookies between requests
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n1. Getting CSRF token..."
$csrfResponse = Invoke-WebRequest -Uri "$API_BASE/csrf/" `
  -WebSession $session `
  -Headers @{
    "Origin" = "http://localhost:5173"
  } `
  -UseBasicParsing

Write-Host "`n2. Cookies after CSRF request:"
$session.Cookies.GetCookies("http://127.0.0.1") | Format-Table Name, Value

# Extract CSRF token
$csrfToken = $session.Cookies.GetCookies("http://127.0.0.1") | Where-Object { $_.Name -eq "csrftoken" } | Select-Object -ExpandProperty Value
Write-Host "CSRF Token: $csrfToken"

# JSON for login
$loginJson = @{
    username = "testuser"
    password = "password123"
} | ConvertTo-Json

Write-Host "`n3. Logging in with test user..."
$loginResponse = Invoke-WebRequest -Uri "$API_BASE/login/" `
  -Method Post `
  -WebSession $session `
  -Headers @{
    "Content-Type" = "application/json"
    "X-CSRFToken" = $csrfToken
    "Origin" = "http://localhost:5173"
  } `
  -Body $loginJson `
  -UseBasicParsing

Write-Host "Login response:"
$loginResponse.Content | ConvertFrom-Json | Format-List

Write-Host "`n4. Checking session status..."
$sessionResponse = Invoke-WebRequest -Uri "$API_BASE/debug-session/" `
  -WebSession $session `
  -Headers @{
    "Origin" = "http://localhost:5173"
  } `
  -UseBasicParsing

Write-Host "Session data:"
$sessionResponse.Content | ConvertFrom-Json | Format-List

Write-Host "`n5. Cookies after login:"
$session.Cookies.GetCookies("http://127.0.0.1") | Format-Table Name, Value

# Extract session ID
$sessionId = $session.Cookies.GetCookies("http://127.0.0.1") | Where-Object { $_.Name -eq "sessionid" } | Select-Object -ExpandProperty Value
Write-Host "`nSession ID: $sessionId"

Write-Host "`nWebSocket testing would require a WebSocket client."
Write-Host "Use a browser or the WebSocket client in the ws_session_debug.py script to test the WebSocket connection."
Write-Host "`nCookies that should be sent to the WebSocket:"
Write-Host "sessionid=$sessionId"

Write-Host "`nTo manually test in browser console:"
Write-Host "const ws = new WebSocket('ws://127.0.0.1:8000/ws/game/');"
Write-Host "ws.onmessage = (e) => console.log(JSON.parse(e.data));"
Write-Host "ws.onopen = () => console.log('WebSocket open');"
Write-Host "ws.onclose = (e) => console.log('WebSocket closed', e);"

Write-Host "`nFor debugging, try the ws_session_debug.py script."
Write-Host "==============================================="