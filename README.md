# 2048 Game with AI Integration

A full-stack implementation of the classic 2048 game with user authentication, WebSocket-based real-time gameplay, and AI agent integration.

## Project Overview

This project is a modern web-based version of the popular 2048 puzzle game with the following features:

- User authentication system (login/registration)
- WebSocket-based real-time game state management
- Backend game logic implemented in Python
- Responsive front-end built with React and Tailwind CSS
- AI agent integration that can play the game autonomously
- Leaderboard system to track high scores

## Technology Stack

### Frontend
- React.js
- Tailwind CSS
- Vite (as build tool)
- WebSocket for real-time communication

### Backend
- Django (web framework)
- Django REST Framework (for API endpoints)
- Django Channels (for WebSocket support)
- SQLite (database)

## System Architecture

The application follows a client-server architecture with the following components:

1. **Frontend**: React application that handles UI rendering and user interactions
2. **Backend**: Django server that manages game logic, user authentication, and data persistence
3. **WebSockets**: Real-time bidirectional communication between client and server
4. **Database**: Stores user data, game states, and leaderboard information

## Program Flow

```
┌─────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                 │     │                   │     │                   │
│  User Interface │     │  WebSocket Server │     │  Game Engine      │
│  (React)        │     │  (Django Channels)│     │  (Python)         │
│                 │     │                   │     │                   │
└─────────────────┘     └───────────────────┘     └───────────────────┘
        │                        │                         │
        │                        │                         │
        │  1. User logs in       │                         │
        │─────────────────────────>                        │
        │                        │                         │
        │  2. Authentication     │                         │
        │<─────────────────────────                        │
        │                        │                         │
        │  3. Connect WebSocket  │                         │
        │─────────────────────────>                        │
        │                        │  4. Create/Load Game    │
        │                        │────────────────────────>│
        │                        │                         │
        │                        │  5. Initial Game State  │
        │                        │<────────────────────────│
        │  6. Render Game        │                         │
        │<─────────────────────────                        │
        │                        │                         │
        │  7. User Move          │                         │
        │─────────────────────────>                        │
        │                        │  8. Process Move        │
        │                        │────────────────────────>│
        │                        │                         │
        │                        │  9. Updated State       │
        │                        │<────────────────────────│
        │  10. Update UI         │                         │
        │<─────────────────────────                        │
        │                        │                         │
        │                        │                         │
        │  11. AI Move Request   │                         │
        │─────────────────────────>                        │
        │                        │  12. AI Move Calculation│
        │                        │────────────────────────>│
        │                        │                         │
        │                        │  13. AI Move & State    │
        │                        │<────────────────────────│
        │  14. Update UI         │                         │
        │<─────────────────────────                        │
        │                        │                         │
```

## Features

### Game Mechanics
- Standard 2048 game rules
- Swipe/arrow key controls for tile movement
- Score tracking
- Game over detection

### User System
- User registration and authentication
- Session management
- Secure logout functionality

### AI Integration
- Framework for implementing various AI agents
- Base agent class that can be extended to create custom strategies
- Sample implementations (greedy agent, random agent)

### Real-time Communication
- WebSocket connections maintain game state between server and client
- State synchronization across devices for logged-in users
- Session management to prevent data leakage between users

## Detailed Project Structure

```
.
├── backend/                       # Django backend
│   ├── db.sqlite3                 # SQLite database file
│   ├── manage.py                  # Django management script
│   ├── requirements.txt           # Python dependencies
│   ├── ws_test.py                 # WebSocket testing utility
│   │
│   ├── ai/                        # AI-related Django app
│   │   ├── __init__.py            # Python package marker
│   │   ├── admin.py               # Django admin configuration for AI models
│   │   ├── apps.py                # AI app configuration
│   │   ├── models.py              # Database models for AI
│   │   ├── tests.py               # Test cases for AI components
│   │   ├── views.py               # API views for AI functionality
│   │
│   ├── core/                      # Core Django project settings
│   │   ├── __init__.py            # Python package marker
│   │   ├── asgi.py                # ASGI configuration for WebSockets
│   │   ├── settings.py            # Django project settings
│   │   ├── urls.py                # Main URL routing configuration
│   │   ├── views.py               # Core views
│   │   ├── wsgi.py                # WSGI configuration for HTTP
│   │
│   ├── game/                      # Game logic and WebSocket consumers
│   │   ├── __init__.py            # Python package marker
│   │   ├── admin.py               # Django admin for game models
│   │   ├── ai_agents.py           # AI agent registry and loader
│   │   ├── apps.py                # Game app configuration
│   │   ├── base_agent.py          # Base class for AI agents
│   │   ├── consumers.py           # WebSocket consumers for game logic
│   │   ├── game_engine.py         # Core 2048 game engine
│   │   ├── models.py              # Database models for game state
│   │   ├── routing.py             # WebSocket URL routing
│   │   ├── serializers.py         # API serializers for game data
│   │   ├── tests.py               # Test cases for game logic
│   │   ├── urls.py                # URL routing for game endpoints
│   │   ├── views.py               # API views for game functionality
│   │   │
│   │   ├── ai_models/             # AI agent implementations
│   │   │   ├── greedy_agent.py    # Greedy algorithm AI agent
│   │   │   ├── random_agent.py    # Random move AI agent
│   │   │
│   │   ├── migrations/            # Database migrations for game models
│   │       ├── __init__.py
│   │       ├── 0001_initial.py    # Initial database schema
│   │
│   ├── users/                     # User management Django app
│       ├── __init__.py            # Python package marker
│       ├── admin.py               # Django admin for user models
│       ├── apps.py                # Users app configuration
│       ├── models.py              # Extended user models
│       ├── signals.py             # User-related signals (e.g., post-save)
│       ├── tests.py               # Test cases for user functionality
│       ├── urls.py                # URL routing for user endpoints
│       ├── views.py               # API views for user management
│       │
│       ├── migrations/            # Database migrations for user models
│           ├── __init__.py
│           ├── 0001_initial.py    # Initial user schema
│
├── frontend/                      # React frontend
│   ├── eslint.config.js           # ESLint configuration
│   ├── index.html                 # HTML entry point
│   ├── package.json               # Node.js dependencies
│   ├── postcss.config.js          # PostCSS configuration for Tailwind
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   ├── vite.config.js             # Vite build configuration
│   │
│   ├── public/                    # Static public assets
│   │
│   └── src/                       # React source code
│       ├── App.css                # Main application styles
│       ├── App.jsx                # Main application component
│       ├── index.css              # Global CSS
│       ├── main.jsx               # React entry point
│       │
│       ├── api/                   # API client code
│       │   ├── api.js             # API request handlers
│       │   ├── csrf.js            # CSRF token utilities
│       │
│       ├── assets/                # Static assets for React
│       │
│       ├── Components/            # React components
│           ├── AIList.jsx         # AI agent selection component
│           ├── GameBoard.jsx      # 2048 game board component
│           ├── Leaderboard.jsx    # High score leaderboard component
│           ├── Login.jsx          # User login form
│           ├── Register.jsx       # User registration form
│
├── docs/                          # Documentation
│
└── infra/                         # Infrastructure configuration
```

## API Endpoints

### User Authentication

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/users/register/` | POST | Register a new user | `{"username": "string", "password": "string", "email": "string"}` | `{"id": int, "username": "string"}` |
| `/api/users/login/` | POST | Login user | `{"username": "string", "password": "string"}` | Session cookie |
| `/api/users/logout/` | POST | Logout user | None | Success message |

### Game API

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/game/leaderboard/` | GET | Get high scores | None | `[{"user": "string", "score": int, "date": "string"}, ...]` |

### WebSocket Endpoints

| Endpoint | Description | Message Types |
|----------|-------------|--------------|
| `ws://server/ws/game/` | Game WebSocket | Connect with session cookie and CSRF token |

#### WebSocket Messages

**Client to Server:**

```json
// Move in a direction
{"type": "move", "direction": "up|down|left|right"}

// Start AI agent
{"type": "start_ai", "agent": "agent_name"}

// Restart game
{"type": "restart"}
```

**Server to Client:**

```json
// Initial game state or update
{"type": "init|update", "board": [[int]], "score": int, "over": bool}

// Error message
{"type": "error", "message": "string"}
```

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```
   python manage.py migrate
   ```

5. Start the development server:
   ```
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

## Game Controls
- Use arrow keys (Up, Down, Left, Right) to move tiles
- Login to save your progress and appear on the leaderboard
- Try different AI agents to see automated gameplay

## Extending the AI System
You can create custom AI agents by extending the `BaseAgent` class and implementing the `get_move(board)` method. Place your implementation in the `backend/game/ai_models/` directory.

## License
This project is open source and available under the MIT License.
