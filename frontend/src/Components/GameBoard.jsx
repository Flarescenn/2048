import { useState, useEffect, useRef } from "react";
import { fetchAIModels, ensureSession, getCurrentUser } from "../api/api.js";

const getTileColor = (value) => {
    switch (value) {
        case 2: return "bg-gray-100 text-gray-800";
        case 4: return "bg-yellow-100 text-gray-800";
        case 8: return "bg-orange-300 text-white";
        case 16: return "bg-orange-500 text-white";
        case 32: return "bg-red-500 text-white";
        case 64: return "bg-red-700 text-white";
        case 128: return "bg-yellow-400 text-white shadow-xl";
        case 256: return "bg-yellow-500 text-white shadow-xl";
        case 512: return "bg-yellow-600 text-white shadow-xl";
        case 1024: return "bg-yellow-700 text-white shadow-2xl";
        case 2048: return "bg-yellow-800 text-white shadow-2xl";
        default: return "bg-gray-300 text-gray-700";
    }
}

export default function GameBoard({ onScoreUpdate }) {
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)))
    const [score, setScore] = useState(0)
    const [over, setOver] = useState(false)
    const wsRef = useRef(null);
    const [wsOpen, setWsOpen] = useState(false);
    const [models, setModels] = useState([]);
    const [username, setUsername] = useState(null);
    
    const gameStateRef = useRef({ wsOpen: false, over: false });
    const reconnectFnRef = useRef(null);
    const usernameRef = useRef(null); // Track username in ref

    // Keep username ref in sync
    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

    const getCookie = (name) => {
        if (!document.cookie) {
            return null;
        }
        const xsrfCookies = document.cookie.split(';')
            .map(c => c.trim())
            .filter(c => c.startsWith(name + '='));

        if (xsrfCookies.length === 0) {
            return null;
        }
        return decodeURIComponent(xsrfCookies[0].substring(name.length + 1));
    }

    const sendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not open. Ready state:", wsRef.current?.readyState);
        }
    }

    const handleKey = (e) => {
        const { wsOpen: currentWsOpen, over: currentOver } = gameStateRef.current;
        
        if (!currentWsOpen || currentOver) {
            return;
        }

        let direction = '';
        switch (e.key) {
            case 'ArrowUp': direction = 'up'; break;
            case 'ArrowDown': direction = 'down'; break;
            case 'ArrowLeft': direction = 'left'; break;
            case 'ArrowRight': direction = 'right'; break;
            default: return;
        }
        e.preventDefault();
        sendMessage({ type: 'move', direction });
    }
    
    // Fetch AI models list ONCE
    useEffect(() => {
        const loadModels = async () => {
            const result = await fetchAIModels();
            if (result.success) {
                setModels(result.data);
            }
        };
        loadModels();
    }, []);

    // Keep the ref updated with the latest state values
    useEffect(() => {
        gameStateRef.current = { wsOpen, over };
    }, [wsOpen, over]);

    // WebSocket connection logic - ONLY runs once on mount
    useEffect(() => {
        let mounted = true;
        console.log("WebSocket connection effect running (should only see this ONCE)");
        
        const initWebSocket = async () => {
            if (!mounted) return;
            
            try {
                await ensureSession();
                
                const isDevelopment = import.meta.env.DEV;
                const connectionId = Date.now().toString(36);
                const sessionId = getCookie("sessionid") || "anonymous";
                
                const loc = window.location;
                let wsUrl;
                
                if (isDevelopment) {
                    wsUrl = `ws://localhost:8000/ws/game/?id=${connectionId}&session=${sessionId}`;
                } else {
                    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${protocol}//${loc.host}/ws/game/?id=${connectionId}&session=${sessionId}`;
                }
                
                console.log("Connecting to WebSocket:", wsUrl);

                if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                    console.log("Closing existing socket before reconnect");
                    wsRef.current.close(1000, "Reconnecting");
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const socket = new WebSocket(wsUrl);
                wsRef.current = socket;
                
                if (!wsRef.current.retryCount) {
                    wsRef.current.retryCount = 0;
                }

                socket.onopen = () => {
                    if (!mounted) return;
                    setWsOpen(true);
                    console.log("%cWebSocket OPEN ✅", "color: green; font-weight: bold;");
                    wsRef.current.retryCount = 0;
                };

                socket.onmessage = (event) => {
                    if (!mounted) return;
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === "init" || data.type === "update") {
                            setBoard(data.board);
                            setScore(data.score);
                            setOver(data.over);
                            
                            if (data.username) {
                                setUsername(data.username);
                            }
                            
                            if (onScoreUpdate) {
                                onScoreUpdate(data.score);
                            }
                        }
                    } catch (err) {
                        console.error("Error parsing message:", err);
                    }
                };

                socket.onclose = (e) => {
                    if (!mounted) return;
                    setWsOpen(false);
                    console.log("%cWebSocket CLOSED", "color: orange;", "Code:", e.code);
                    
                    // Don't auto-reconnect on normal closes
                    if (e.code === 1000 || e.code === 1001) {
                        return;
                    }

                    const retryCount = wsRef.current?.retryCount || 0;
                    
                    if (retryCount < 5) {
                        const reconnectDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                        console.log(`Reconnect attempt ${retryCount + 1}/5 in ${reconnectDelay}ms`);
                        
                        setTimeout(() => {
                            if (mounted && wsRef.current) {
                                wsRef.current.retryCount = retryCount + 1;
                                initWebSocket();
                            }
                        }, reconnectDelay);
                    }
                };

                socket.onerror = (e) => {
                    console.error("WebSocket Error:", e);
                };
            } catch (error) {
                console.error("Error setting up WebSocket:", error);
            }
        };
        
        // Store reconnect function in ref
        reconnectFnRef.current = () => {
            console.log("Manual reconnect triggered");
            if (wsRef.current) {
                wsRef.current.close(1000, "Manual reconnect");
            }
            setTimeout(() => initWebSocket(), 200);
        };
        
        initWebSocket();
        window.addEventListener('keydown', handleKey);

        return () => {
            console.log("WebSocket effect cleanup");
            mounted = false;
            window.removeEventListener('keydown', handleKey);
            
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                    wsRef.current.close(1000, "Component unmounted");
                }
            }
        };
    }, []); // Empty dependency array - only run once!
    
    // Auth checking - completely separate from WebSocket
    useEffect(() => {
        console.log("Auth effect running (should only see this ONCE)");
        
        const checkAuth = async () => {
            try {
                const user = await getCurrentUser();
                setUsername(user || null);
            } catch (error) {
                console.error("Error checking authentication:", error);
            }
        };
        
        checkAuth();
        
        const handleAuthChange = (event) => {
            const { authenticated, user } = event.detail;
            const previousUsername = usernameRef.current;
            
            console.log(`Auth change: ${previousUsername} → ${user?.username || 'null'}`);
            
            if (authenticated && user && user.username) {
                setUsername(user.username);
                
                // Only reconnect if this is a NEW login
                if (!previousUsername && reconnectFnRef.current) {
                    console.log("New login detected - reconnecting");
                    setTimeout(() => reconnectFnRef.current(), 500);
                }
            } else {
                setUsername(null);
                
                // Only reconnect if user was logged in before
                if (previousUsername && reconnectFnRef.current) {
                    console.log("Logout detected - reconnecting");
                    setTimeout(() => reconnectFnRef.current(), 500);
                }
            }
        };
        
        window.addEventListener('auth-state-change', handleAuthChange);
        
        // Check auth less frequently to reduce API spam
        const authCheckInterval = setInterval(checkAuth, 30000); // Every 30 seconds instead of 10
        
        return () => {
            console.log("Auth effect cleanup");
            window.removeEventListener('auth-state-change', handleAuthChange);
            clearInterval(authCheckInterval);
        };
    }, []); // Empty dependency array!

    const handleRestart = () => {
        sendMessage({ type: 'restart' });
    }

    const handleManualReconnect = () => {
        if (reconnectFnRef.current) {
            reconnectFnRef.current();
        }
    };

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-blue-500">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">2048 Game Board</h2>
                {username && (
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        Welcome, {username}!
                    </div>
                )}
            </div>
            
            {over && 
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4 text-center">
                    <h3 className="text-2xl font-extrabold">Game Over!</h3>
                    <p>Final Score: {score}</p>
                </div>
            }

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <p className={`text-sm font-medium ${wsOpen ? 'text-green-600' : 'text-red-600'} mr-2`}>
                        Connection: {wsOpen ? 'Live' : 'Closed'}
                    </p>
                    {!wsOpen && (
                        <button 
                            onClick={handleManualReconnect}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition duration-300"
                        >
                            Reconnect
                        </button>
                    )}
                </div>
                <button 
                    onClick={handleRestart} 
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-300 shadow-md"
                    disabled={!wsOpen}
                >
                    Restart Game
                </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 w-full max-w-sm mx-auto p-2 bg-gray-400 rounded-lg shadow-inner">
                {board.flat().map((cell, idx) => (
                    <div 
                        key={idx} 
                        className={`w-full aspect-square flex items-center justify-center rounded-lg text-2xl font-bold transition-all duration-200 transform ${getTileColor(cell)}`}
                        style={{ 
                            transform: cell > 0 ? 'scale(1)' : 'scale(0.8)', 
                            opacity: cell > 0 ? 1 : 0.5 
                        }}
                    >
                        {cell > 0 ? cell : ''}
                    </div>
                ))}
            </div>
        </div>
    )
}