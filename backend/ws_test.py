import asyncio
import websockets
import json

async def test_websocket():
    import traceback
    import time
    
    # Generate test IDs
    session_id = "test_session"
    connection_id = f"test_{int(time.time())}"
    
    headers = {
        'Cookie': f'sessionid={session_id}; csrftoken=TestCSRFToken',
        'Origin': 'http://localhost:8000',
    }
    
    uri = f'ws://127.0.0.1:8000/ws/game/?id={connection_id}&session={session_id}'
    print(f'Attempting WebSocket connection to: {uri}')
    print(f'With headers: {headers}')
    
    try:
        async with websockets.connect(
            uri,
            extra_headers=headers
        ) as websocket:
            print('Connected to WebSocket successfully!')
            
            # Wait for initial state message
            init_response = await websocket.recv()
            print(f'Initial game state: {init_response}')
            
            # Send a ping message
            print('Sending ping message...')
            await websocket.send(json.dumps({'type': 'ping'}))
            ping_response = await websocket.recv()
            print(f'Ping response: {ping_response}')
            
            # Send a move command
            print('Sending move command...')
            await websocket.send(json.dumps({'type': 'move', 'direction': 'up'}))
            move_response = await websocket.recv()
            print(f'Move response: {move_response}')
            
            # Send a restart command
            print('Sending restart command...')
            await websocket.send(json.dumps({'type': 'restart'}))
            restart_response = await websocket.recv()
            print(f'Restart response: {restart_response}')
    except Exception as e:
        print(f'\nWebSocket Connection Error:')
        print(f'Error type: {type(e).__name__}')
        print(f'Error message: {str(e)}')
        if hasattr(e, 'status_code'):
            print(f'HTTP Status Code: {e.status_code}')
        print('\nTraceback:')
        traceback.print_exc()
        
        # Additional debug info
        print('\nDebug Info:')
        print(f'Python websockets version: {websockets.__version__}')

asyncio.run(test_websocket())
