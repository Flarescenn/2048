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
                    await self.channel_layer.group_send(
                        self.group_name,
                        {
                            "type": "broadcast_state",
                            "board": game.board,
                            "score": game.score,
                            "over": game.over
                        }
                    )
        except asyncio.CancelledError:
            pass
        finally:
            self.ai_task = None

    async def connect(self):
        # Debug logging
        print(">>> WebSocket Connection Attempt <<<")
        print(f"Scope keys: {self.scope.keys()}")
        print(f"Headers: {dict(self.scope.get('headers', []))}")
        
        # 1. ENFORCE AUTHENTICATION
        user = self.scope.get("user", None)
        session = self.scope.get("session", None)
        
        print(f"User: {user}")
        print(f"Session: {session}")
        
        if not user or user.is_anonymous or not session:
            print(">>> SERVER LOG: AUTH REJECTED <<<")
            print(f"User exists: {bool(user)}")
            print(f"User anonymous: {user.is_anonymous if user else 'N/A'}")
            print(f"Session exists: {bool(session)}")
            await self.close(code=4001)
            return
            
        # 2. Set the unique key and group name based on the session ID from URL
        try:
            self.game_key = self.scope['url_route']['kwargs']['session_id']
            self.group_name = f"game_{self.game_key}"
            print(f"Authenticated User {user.pk} Connected. Game Key: {self.game_key}")
        except KeyError:
            print(">>> SERVER LOG: No session_id in URL <<<")
            await self.close(code=4002)
            return
        
        await self.accept()

        # 4. Create or retrieve the game using the unique key
        if self.game_key not in active_games:
            print(f"Creating new game for user {self.game_key}")
            active_games[self.game_key] = Game2048()
        
        self.game = active_games[self.game_key]
        
        # 5. Add to group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        # 6. Send initial game state
        await self.send(text_data=json.dumps({
            "type": "init",
            "board": self.game.board,
            "score": self.game.score,
            "over": self.game.over
        }))

    async def disconnect(self, close_code):
        if self.ai_task:
            self.ai_task.cancel()
            
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        
        print(f"WebSocket disconnected with code {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            
            # Since connect() enforces authentication, we can assume self.game is set.
            if not self.game: return 
            
            # Handle player moves and other logic (unchanged from your previous version)
            if data.get("type") == "move":
                direction = data.get("direction")
                if direction in ["up", "down", "left", "right"]:
                    moved = self.game.move(direction)
                    
                    if moved:
                        await self.channel_layer.group_send(
                            self.group_name,
                            {"type": "broadcast_state", "board": self.game.board, "score": self.game.score, "over": self.game.over}
                        )
                    # ... (error message logic omitted for brevity, but keep in your file)
            
            # Handle AI requests (unchanged logic)
            elif data.get("type") == "ai":
                agent_name = data.get("agent")
                if agent_name:
                    if self.ai_task: self.ai_task.cancel(); self.ai_task = None
                    self.ai_task = asyncio.create_task(self.run_ai(self.game, agent_name))
                    # ... (message send logic omitted for brevity)
            
            # Handle restart requests
            elif data.get("type") == "restart":
                if self.ai_task: self.ai_task.cancel(); self.ai_task = None
                
                # RESTART: Use the unique game_key to reset the correct game instance
                active_games[self.game_key] = Game2048() 
                self.game = active_games[self.game_key]
                
                await self.channel_layer.group_send(
                    self.group_name,
                    {"type": "broadcast_state", "board": self.game.board, "score": self.game.score, "over": self.game.over}
                )
        
        except Exception as e:
            print(f"Error processing message: {str(e)}")
            await self.send(text_data=json.dumps({"type": "error", "message": f"Error: {str(e)}"}))

    async def broadcast_state(self, event):
        await self.send(text_data=json.dumps({
            "type": "update", "board": event["board"], "score": event["score"], "over": event["over"]
        }))

# Save this file as your game/consumers.py