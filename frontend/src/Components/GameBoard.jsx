import { useState, useEffect, useRef } from "react";
// Import the correct functions from API
import { fetchAIModels, ensureSession } from "../api/api.js"; 

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

// Accept onScoreUpdate prop from App.jsx
export default function GameBoard({ onScoreUpdate }){ 
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)))
    const [score, setScore] = useState(0)
    const [over, setOver] = useState(false)
    const wsRef = useRef(null);
    const [wsOpen, setWsOpen] = useState(false);
    const [models, setModels] = useState([]);
    
    // 🎯 FIX 1: Ref to hold the current game state/status for the event listener
    const gameStateRef = useRef({ wsOpen: false, over: false }); 

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
            // This error should now be virtually eliminated by the handleKey check
            console.error("WebSocket is not open. Ready state:", wsRef.current?.readyState);
        }
    }

    // 🎯 FIX 2: handleKey now reads from the ref, ensuring it uses the latest wsOpen and over status
    const handleKey = (e) => {
        const { wsOpen: currentWsOpen, over: currentOver } = gameStateRef.current;
        
        if (!currentWsOpen || currentOver) { 
            console.warn("Ignoring key press: WebSocket closed, connecting, or game over.");
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
    
    // Fetch AI models list
    useEffect(() => {
        const loadModels = async () => {
            const result = await fetchAIModels();
            if (result.success) {
                setModels(result.data);
            }
        };
        loadModels();
    }, []);

    // 🎯 FIX 3: Effect to keep the ref updated with the latest state values
    useEffect(() => {
        gameStateRef.current = { wsOpen, over };
    }, [wsOpen, over]);

    // WebSocket connection logic
    useEffect(() => {
        let mounted = true;
        
        const initWebSocket = async () => {
            try {
                await ensureSession();
                
                const session = getCookie("sessionid");
                const csrf = getCookie("csrftoken");
                
                console.log("Session after ensure:", session);
                console.log("CSRF after ensure:", csrf);
                
                // Get environment and determine WebSocket URL
                const isDevelopment = import.meta.env.DEV;
                let wsUrl;
                
                // Generate a unique connection ID and get session
                const connectionId = Date.now().toString(36); 
                const sessionId = getCookie("sessionid") || "anonymous";

                // Test multiple connection approaches - the most common WebSocket issue is the URL
                // We'll try different options and log what we're trying
                
                console.log("Trying to determine best WebSocket URL in environment:", 
                    isDevelopment ? "Development" : "Production");
                
                // Get the current window location for relative URLs
                const loc = window.location;
                console.log("Current location:", loc.toString());
                
                if (isDevelopment) {
                    // In development, we need to handle the fact that frontend and backend 
                    // are on different ports/servers
                    
                    // OPTION 1: Direct connection to backend (most reliable in development)
                    wsUrl = `ws://127.0.0.1:8000/ws/game/?id=${connectionId}&session=${sessionId}`;
                    console.log("Using direct IP connection to backend:", wsUrl);
                    
                    // If you're having problems with the direct connection, try these alternatives:
                    // OPTION 2: Localhost instead of IP
                    // wsUrl = `ws://localhost:8000/ws/game/?id=${connectionId}&session=${sessionId}`;
                    
                    // OPTION 3: Use relative path (requires proper Vite proxy setup)
                    // wsUrl = `ws://${loc.host}/ws/game/?id=${connectionId}&session=${sessionId}`;
                } else {
                    // For production, use the relative path based on current domain
                    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${protocol}//${loc.host}/ws/game/?id=${connectionId}&session=${sessionId}`;
                    console.log("Using production WebSocket URL:", wsUrl);
                }
                
                console.log("WebSocket URL (final):", wsUrl);
                console.log("Session cookie:", sessionId);

                if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                    console.log("Socket already connecting/open, skipping extra connection attempt.");
                    return; 
                }

                const socket = new WebSocket(wsUrl);
                wsRef.current = socket;
                
                if (!wsRef.current.retryCount) {
                    wsRef.current.retryCount = 0;
                }

                socket.onopen = () => {
                    if (mounted) {
                        setWsOpen(true);
                        console.log("%cWebSocket connection established! ✅", "color: green; font-weight: bold;");
                        console.log("Socket ready state:", socket.readyState);
                        wsRef.current.retryCount = 0; 
                        
                        // Send a ping to ensure the connection is really working
                        try {
                            setTimeout(() => {
                                if (socket && socket.readyState === WebSocket.OPEN) {
                                    console.log("Sending ping message to verify connection");
                                    socket.send(JSON.stringify({ type: "ping" }));
                                }
                            }, 1000);
                        } catch (err) {
                            console.error("Error sending ping message:", err);
                        }
                    }
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log("Received websocket message:", data.type);
                        
                        if (data.type === "init" || data.type === "update") {
                            setBoard(data.board);
                            setScore(data.score);
                            setOver(data.over);
                            
                            if (onScoreUpdate) {
                                onScoreUpdate(data.score);
                            }
                            
                            // For debugging - log only on init or score changes
                            if (data.type === "init" || data.score > score) {
                                console.log("Game state updated:", { 
                                    board: data.board,
                                    score: data.score, 
                                    over: data.over
                                });
                            }
                        } else if (data.type === "error") {
                            console.error("%cWebSocket Error from server:", "color: red; font-weight: bold;", data.message);
                        } else if (data.type === "pong") {
                            console.log("Received pong response - connection verified");
                        }
                    } catch (err) {
                        console.error("Error parsing message:", err, "Raw data:", event.data);
                    }
                };

                socket.onclose = (e) => {
                    if (mounted) {
                        setWsOpen(false);
                        console.log("%cWebSocket Closed", "color: orange; font-weight: bold;");
                        console.log("Code:", e.code, "Reason:", e.reason || "No Reason");
                        console.log("Was Clean:", e.wasClean);
                        
                        if (e.code === 1000 || e.code === 1001) { 
                            console.log("Normal close, not reconnecting.");
                            return;
                        }

                        const retryCount = wsRef.current?.retryCount || 0;
                        
                        if (retryCount < 5) {
                            const reconnectDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); 
                            console.log(`WebSocket reconnect attempt ${retryCount + 1}/5 in ${reconnectDelay}ms`);
                            
                            setTimeout(() => {
                                if (mounted) {
                                    const sessionCookie = getCookie("sessionid");
                                    // We'll try to reconnect even without session now
                                    if (!sessionCookie) {
                                        console.log("No session cookie found, trying anonymous connection");
                                    }
                                    
                                    if (wsRef.current) {
                                        wsRef.current.retryCount = retryCount + 1;
                                    }
                                    console.log("%cAttempting to reconnect WebSocket...", "color: blue; font-weight: bold;");
                                    initWebSocket(); 
                                }
                            }, reconnectDelay);
                        } else {
                            console.log("%cMaximum reconnection attempts reached. Please refresh the page.", "color: red; font-weight: bold;");
                            alert("Connection to game server lost. Please refresh the page to reconnect.");
                        }
                    }
                };

                socket.onerror = (e) => {
                    console.error("%cWebSocket Error:", "color: red; font-weight: bold;", e);
                    // On error, try to log more details for debugging
                    console.log("Socket state at error:", {
                        readyState: socket.readyState,
                        bufferedAmount: socket.bufferedAmount,
                        protocol: socket.protocol
                    });
                };

            } catch (error) {
                console.error("Error setting up WebSocket connection:", error);
            }
        };
        
        initWebSocket();

        // Add keydown listener only once (this can be moved outside the effect if preferred)
        window.addEventListener('keydown', handleKey);

        // Cleanup function for useEffect
        return () => {
            mounted = false;
            window.removeEventListener('keydown', handleKey);
            
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
                     wsRef.current.close(1000, "Component unmounted");
                }
            }
        };
    }, []); // Removed onScoreUpdate dependency to prevent reconnecting when parent updates

    // Restart the game
    const handleRestart = () => {
        sendMessage({ type: 'restart' });
    }

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-blue-500">
            <h2 className="text-xl font-bold mb-4 text-gray-800">2048 Game Board</h2>
            
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
                            onClick={() => {
                                console.log("Manual reconnect requested");
                                if (wsRef.current) {
                                    if (wsRef.current.readyState === WebSocket.OPEN || 
                                        wsRef.current.readyState === WebSocket.CONNECTING) {
                                        wsRef.current.close();
                                    }
                                    wsRef.current = null;
                                }
                                // Force a new connection
                                const initWebSocket = async () => {
                                    try {
                                        await ensureSession();
                                        const connectionId = Date.now().toString(36);
                                        const sessionId = getCookie("sessionid") || "anonymous";
                                        const wsUrl = `ws://127.0.0.1:8000/ws/game/?id=${connectionId}&session=${sessionId}`;
                                        console.log("Reconnecting with URL:", wsUrl);
                                        
                                        const socket = new WebSocket(wsUrl);
                                        wsRef.current = socket;
                                        
                                        socket.onopen = () => {
                                            setWsOpen(true);
                                            console.log("Reconnection successful!");
                                        };
                                        
                                        socket.onclose = () => {
                                            setWsOpen(false);
                                            console.log("Reconnection failed");
                                        };
                                        
                                        socket.onmessage = (event) => {
                                            try {
                                                const data = JSON.parse(event.data);
                                                console.log("Received:", data.type);
                                                
                                                if (data.type === "init" || data.type === "update") {
                                                    setBoard(data.board);
                                                    setScore(data.score);
                                                    setOver(data.over);
                                                    
                                                    if (onScoreUpdate) {
                                                        onScoreUpdate(data.score);
                                                    }
                                                }
                                            } catch (err) {
                                                console.error("Error processing message:", err);
                                            }
                                        };
                                        
                                        socket.onerror = (e) => {
                                            console.error("Reconnection error:", e);
                                        };
                                        
                                    } catch (error) {
                                        console.error("Error in manual reconnection:", error);
                                    }
                                };
                                
                                initWebSocket();
                            }}
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