import asyncio
import websockets
import json

async def test_websocket():
    import traceback
    
    headers = {
        'Cookie': f'sessionid=9cpom0gwcz0mercuspfghithamtj89k5; csrftoken=YcCgJBiBdIXzY6C6BxcmCykMbrnhxyHQ',
    }
    
    uri = 'ws://localhost:8000/ws/game/test123/'  # matches the URL pattern in routing.py
    print(f'Attempting WebSocket connection to: {uri}')
    print(f'With headers: {headers}')
    
    try:
        async with websockets.connect(
            uri,
            additional_headers=headers  # websockets library uses additional_headers, not extra_headers
        ) as websocket:
            print('Connected to WebSocket')
            
            # Send a move command
            await websocket.send(json.dumps({'type': 'move', 'direction': 'up'}))
            response = await websocket.recv()
            print(f'Received: {response}')
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
