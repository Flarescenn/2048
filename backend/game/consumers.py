import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .game_engine import Game2048 # Assuming Game2048 is defined elsewhere
from game.ai_agents import AGENTS # Assuming AGENTS is defined elsewhere
import asyncio

active_games = {} # Global state dictionary

class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ai_task = None
        self.group_name = None
        # CRITICAL: self.game_key will now be the user's unique ID
        self.game_key = None 
        self.game = None

    async def run_ai(self, game, agent_name):
        agent_cls = AGENTS.get(agent_name.lower())
        if not agent_cls:
            return

        agent = agent_cls()
        try:
            while not game.over:
                await asyncio.sleep(0.3)
                move = agent.get_move(game.board)
                moved = game.move(move)

                if moved:
                    try:
                        if hasattr(self, 'channel_layer'):
                            await self.channel_layer.group_send(
                                self.group_name,
                                {
                                    "type": "broadcast_state",
                                    "board": game.board,
                                    "score": game.score,
                                    "over": game.over
                                }
                            )
                        else:
                            # Fallback to direct send if channel layer is not available
                            await self.send(text_data=json.dumps({
                                "type": "update",
                                "board": game.board,
                                "score": game.score,
                                "over": game.over
                            }))
                    except Exception as e:
                        print(f"Error sending AI move update: {str(e)}")
        except asyncio.CancelledError:
            pass
        finally:
            self.ai_task = None

    async def connect(self):
        try:
            # Enhanced Debug logging
            print("\n" + "="*50)
            print(">>> WebSocket Connection Attempt <<<")
            print("="*50)
            
            # 1. GET USER INFO - We need to check multiple sources
            user = self.scope.get("user", None)
            session = self.scope.get("session", None)
            
            # Get the full scope for debugging
            headers = dict(self.scope.get('headers', []))
            if b'host' in headers:
                print(f"Host header: {headers[b'host'].decode()}")
            if b'origin' in headers:
                print(f"Origin header: {headers[b'origin'].decode()}")
            if b'cookie' in headers:
                print(f"Cookie header found: {len(headers[b'cookie'])} bytes")
            if b'sec-websocket-version' in headers:
                print(f"WebSocket version: {headers[b'sec-websocket-version'].decode()}")
            
            # Get the session ID from query parameters if available
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            print(f"Raw query string: {query_string}")
            
            query_params = {}
            if query_string:
                for param in query_string.split('&'):
                    if '=' in param:
                        key, value = param.split('=', 1)  # Split on first = only
                        query_params[key] = value
            
            # More detailed logging
            print(f"User from scope: {user}")
            print(f"Is anonymous from scope: {user.is_anonymous if user else 'No user'}")
            
            # Try to get authentication from Django's session
            authenticated_username = None
            
            # First check Django scope
            if not (user and user.is_anonymous) and user:
                authenticated_username = user.username
                print(f"Found authenticated user in scope: {authenticated_username}")
                
            # Then try session object directly
            elif session:
                session_dict = session.get_decoded() if hasattr(session, 'get_decoded') else {}
                if '_auth_user_id' in session_dict:
                    # We have an authenticated user in the session!
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        user_id = session_dict.get('_auth_user_id')
                        if user_id:
                            auth_user = User.objects.get(pk=user_id)
                            authenticated_username = auth_user.username
                            print(f"Found authenticated user in session: {authenticated_username}")
                            # Update the user in scope for other middleware
                            user = auth_user
                    except Exception as e:
                        print(f"Error getting user from session: {e}")
            
            print(f"Session: {session}")
            print(f"Session key: {session.session_key if session else 'No session key'}")
            print(f"Query params: {query_params}")
            print(f"Final authenticated username: {authenticated_username}")
            
            # We'll accept ALL connections now, with or without session
            # This is a game, so we can be more lenient
            
            # 2. Generate a game key based on user, session, query param, or channel name
            if authenticated_username:
                # For authenticated users, use their username directly
                print(f"Using authenticated username for game key: {authenticated_username}")
                self.game_key = f"user_{authenticated_username}"
            elif user and not user.is_anonymous:
                user_id = str(user.pk)
                self.game_key = f"user_{user_id}"
            elif 'session' in query_params and query_params['session'] != 'anonymous':
                # Use session from query params if provided
                session_id = query_params['session']
                self.game_key = f"session_{session_id}"
            elif session and session.session_key:
                # For anonymous users with session, use session key
                self.game_key = f"anon_{session.session_key}"
            else:
                # Fallback to channel name if no session
                self.game_key = f"temp_{self.channel_name}"
            
            self.group_name = f"game_{self.game_key}"
            
            # Debug logs
            print(f"Game key assigned: {self.game_key}")
            print(f"Group name: {self.group_name}")
            
            # 3. Accept the connection FIRST
            await self.accept()
            print("Connection accepted")
            
            # 4. Create or retrieve the game
            if self.game_key not in active_games:
                print(f"Creating new game for {self.game_key}")
                active_games[self.game_key] = Game2048()
            else:
                print(f"Using existing game for {self.game_key}")
            
            self.game = active_games[self.game_key]
            
            # 5. Try to add to channel layer group but handle if it fails
            try:
                if hasattr(self, 'channel_layer'):
                    await self.channel_layer.group_add(self.group_name, self.channel_name)
                    print(f"Added to group {self.group_name}")
                else:
                    print("WARNING: No channel layer available - group messaging disabled")
            except Exception as e:
                print(f"Error adding to group: {str(e)}")
                print("Continuing without group messaging support")
            
            # 6. Send initial game state with username if authenticated
            try:
                # Extract username from game_key if available
                username = None
                if self.game_key and self.game_key.startswith("user_"):
                    username = self.game_key[5:]  # Remove the "user_" prefix
                
                await self.send(text_data=json.dumps({
                    "type": "init",
                    "board": self.game.board,
                    "score": self.game.score,
                    "over": self.game.over,
                    "username": username  # Will be null for anonymous users
                }))
                print(f"Sent initial game state for {self.game_key}")
                if username:
                    print(f"Included username in response: {username}")
            except Exception as e:
                print(f"Failed to send initial game state: {str(e)}")
                raise  # Re-raise to properly close the connection
            
        except Exception as e:
            import traceback
            print(f"ERROR IN CONNECT: {str(e)}")
            print("Detailed exception:")
            traceback.print_exc()
            # Try to close gracefully
            await self.close(code=1011)
            return

    async def disconnect(self, close_code):
        try:
            print(f"WebSocket disconnect started with code {close_code} for game_key: {self.game_key}")
            
            # Cancel any running AI task
            if self.ai_task:
                self.ai_task.cancel()
                print(f"AI task cancelled for {self.game_key}")
            
            # Remove from channel group
            if hasattr(self, 'group_name') and self.group_name:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
                print(f"Removed from group {self.group_name}")
            
            # If it's an abnormal close and we have a game, save its state
            if close_code != 1000 and self.game and self.game_key:
                # Don't remove the game from active_games - it will persist for reconnection
                print(f"Preserving game state for {self.game_key} for reconnection")
            else:
                # If it's a normal close or logout, clean up the game
                if self.game_key and self.game_key in active_games:
                    print(f"Normal close, removing game for {self.game_key}")
                    active_games.pop(self.game_key, None)
            
            print(f"WebSocket disconnected with code {close_code}")
        except Exception as e:
            print(f"ERROR IN DISCONNECT: {str(e)}")
            # Nothing more we can do in disconnect

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            # Handle ping messages first - these don't need a game instance
            if data.get("type") == "ping":
                print(f"Received ping from {self.game_key}, responding with pong")
                await self.send(text_data=json.dumps({"type": "pong"}))
                return
            
            if not self.game:
                print("Received message but no game instance available")
                await self.send(text_data=json.dumps({"type": "error", "message": "No active game"}))
                return 
            
            if data.get("type") == "move":
                direction = data.get("direction")
                if direction in ["up", "down", "left", "right"]:
                    moved = self.game.move(direction)
                    
                    if moved:
                        try:
                            # Extract username from game_key if available
                            username = None
                            if self.game_key and self.game_key.startswith("user_"):
                                username = self.game_key[5:]  # Remove the "user_" prefix
                                
                            if hasattr(self, 'channel_layer'):
                                await self.channel_layer.group_send(
                                    self.group_name,
                                    {"type": "broadcast_state", "board": self.game.board, "score": self.game.score, "over": self.game.over, "username": username}
                                )
                            else:
                                # Fallback to direct send if no channel layer
                                await self.send(text_data=json.dumps({
                                    "type": "update",
                                    "board": self.game.board,
                                    "score": self.game.score,
                                    "over": self.game.over,
                                    "username": username
                                }))
                        except Exception as e:
                            print(f"Error sending move update: {str(e)}")
                            # Try direct send as fallback
                            try:
                                await self.send(text_data=json.dumps({
                                    "type": "update",
                                    "board": self.game.board,
                                    "score": self.game.score,
                                    "over": self.game.over
                                }))
                            except Exception as inner_e:
                                print(f"Fallback send also failed: {str(inner_e)}")
                        
            elif data.get("type") == "ai":
                agent_name = data.get("agent")
                if agent_name:
                    if self.ai_task: 
                        self.ai_task.cancel()
                        self.ai_task = None
                        print(f"Cancelled previous AI task for {agent_name}")
                    self.ai_task = asyncio.create_task(self.run_ai(self.game, agent_name))
                    print(f"Started new AI task for {agent_name}")
                    
            elif data.get("type") == "restart":
                if self.ai_task: 
                    self.ai_task.cancel()
                    self.ai_task = None
                    print("Cancelled AI task for restart")
                
                # RESTART: Use the unique user-based game_key to reset the correct game instance
                active_games[self.game_key] = Game2048() 
                self.game = active_games[self.game_key]
                print(f"Game restarted for {self.game_key}")
                
                try:
                    # Extract username from game_key if available
                    username = None
                    if self.game_key and self.game_key.startswith("user_"):
                        username = self.game_key[5:]  # Remove the "user_" prefix
                        
                    if hasattr(self, 'channel_layer'):
                        await self.channel_layer.group_send(
                            self.group_name,
                            {"type": "broadcast_state", "board": self.game.board, "score": self.game.score, "over": self.game.over, "username": username}
                        )
                    else:
                        # Fallback to direct send if no channel layer
                        await self.send(text_data=json.dumps({
                            "type": "update",
                            "board": self.game.board,
                            "score": self.game.score,
                            "over": self.game.over,
                            "username": username
                        }))
                except Exception as e:
                    print(f"Error sending restart update: {str(e)}")
                    # Try direct send as fallback
                    try:
                        await self.send(text_data=json.dumps({
                            "type": "update",
                            "board": self.game.board,
                            "score": self.game.score,
                            "over": self.game.over
                        }))
                    except Exception as inner_e:
                        print(f"Fallback send also failed: {str(inner_e)}")
        
        except Exception as e:
            print(f"Error processing message: {str(e)}")
            import traceback
            traceback.print_exc()
            try:
                await self.send(text_data=json.dumps({"type": "error", "message": f"Error: {str(e)}"}))
            except Exception as send_e:
                print(f"Failed to send error message: {str(send_e)}")

    async def broadcast_state(self, event):
        try:
            # Extract username from game_key if available
            username = None
            if self.game_key and self.game_key.startswith("user_"):
                username = self.game_key[5:]  # Remove the "user_" prefix
            
            # Add username to the update message
            await self.send(text_data=json.dumps({
                "type": "update", 
                "board": event["board"], 
                "score": event["score"], 
                "over": event["over"],
                "username": username  # Will be null for anonymous users
            }))
        except Exception as e:
            print(f"Error in broadcast_state: {str(e)}")
