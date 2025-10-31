import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { fetchAIModels, ensureSession, getCurrentUser, completeGame } from "../api/api.js";

// Original
const getTileColor = (value) => {
    switch (value) {
        case 2: return "bg-gray-500/15 text-gray-300 border border-gray-500/25";
        case 4: return "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30";
        case 8: return "bg-orange-500/30 text-orange-100 border border-orange-500/40";
        case 16: return "bg-orange-600/35 text-orange-50 border border-orange-600/45";
        case 32: return "bg-red-500/40 text-red-100 border border-red-500/50";
        case 64: return "bg-red-600/45 text-red-50 border border-red-600/55";
        case 128: return "bg-yellow-400/50 text-yellow-50 border border-yellow-400/60 shadow-lg";
        case 256: return "bg-yellow-500/55 text-white border border-yellow-500/65 shadow-lg";
        case 512: return "bg-yellow-600/60 text-white border border-yellow-600/70 shadow-xl";
        case 1024: return "bg-yellow-700/65 text-white border border-yellow-700/75 shadow-xl";
        case 2048: return "bg-yellow-800/70 text-white border border-yellow-800/80 shadow-2xl";
        case 4096: return "bg-purple-600/60 text-purple-50 border border-purple-600/70 shadow-2xl";
        case 8192: return "bg-purple-700/65 text-purple-50 border border-purple-700/75 shadow-2xl";
        case 16384: return "bg-purple-900/70 text-purple-100 border border-purple-900/80 shadow-2xl";
        case 32768: return "bg-pink-600/70 text-pink-50 border border-pink-600/80 shadow-2xl";
        case 65536: return "bg-pink-800/70 text-pink-50 border border-pink-800/80 shadow-2xl";
        case 131072: return "bg-indigo-700/70 text-indigo-50 border border-indigo-700/80 shadow-2xl";
        default: 
            if (value > 131072) {
                return "bg-black/50 text-yellow-300 shadow-2xl border-2 border-yellow-400/60";
            }
            return "bg-slate-700/20 text-slate-400 border border-slate-600/30";
    }
}


const GameBoard = forwardRef(({ onScoreUpdate }, ref) => {
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)))
    const [score, setScore] = useState(0)
    const [over, setOver] = useState(false)
    const wsRef = useRef(null);
    const [wsOpen, setWsOpen] = useState(false);
    const [models, setModels] = useState([]);
    const [username, setUsername] = useState(null);
    const [gameSaved, setGameSaved] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [isAiAssisted, setIsAiAssisted] = useState(false);

    const [inPlaybackMode, setInPlaybackMode] = useState(false);
    const [aiMoves, setAiMoves] = useState([]);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [lastMoveDirection, setLastMoveDirection] = useState(null);
    const [animationKey, setAnimationKey] = useState(0);

    const stateRef = useRef();
    stateRef.current = { over, inPlaybackMode, playbackIndex, aiMoves };

    const gameStateRef = useRef({ wsOpen: false, over: false });
    const reconnectFnRef = useRef(null);
    const usernameRef = useRef(null);

    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

    const handleStartAI = ({ agent, num_moves }) => {
        if (over || inPlaybackMode) {
            console.log("Cannot start AI while game is over or in playback mode.");
            return;
        }
        console.log(`Requesting ${num_moves} moves from ${agent}...`);
        sendMessage({
            type: 'get_ai_moves',
            agent: agent,
            num_moves: num_moves
        });
    };

    useImperativeHandle(ref, () => ({
        startAI: handleStartAI
    }));

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

    const handleNextMove = () => {
        setPlaybackIndex(prevIndex => Math.min(prevIndex + 1, aiMoves.length - 1));
    };

    const handlePreviousMove = () => {
        setPlaybackIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };
    
    const handleSkipToEnd = () => {
        if (aiMoves.length > 0) {
            setPlaybackIndex(aiMoves.length - 1);
        }
    };

    useEffect(() => {
        const loadModels = async () => {
            const result = await fetchAIModels();
            if (result.success) {
                setModels(result.data);
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (over && !gameSaved && username) {
            const save = async () => {
                console.log('Game over detected - auto-saving game...');
                setGameSaved(true); 
                const gameMode = isAiAssisted ? 'ai' : 'manual';
                const result = await completeGame(score, board, gameMode);
                
                if (result.success) {
                    console.log('✅ Game saved successfully!', result.data);
                    setSaveMessage(`🎉 Earned ${result.data.points_earned} points!`);
                    setTimeout(() => setSaveMessage(''), 5000);
                    window.dispatchEvent(new CustomEvent('game-completed', {
                        detail: result.data
                    }));
                } else {
                    console.error('❌ Failed to save game:', result.error);
                    setSaveMessage(`Failed to save game: ${result.error} 😔`);
                }
            };
            save();
        }
    }, [over, gameSaved, username, score, board, isAiAssisted]);

    useEffect(() => {
        if (!over && gameSaved) {
            setGameSaved(false);
            setSaveMessage('');
        }
    }, [over, gameSaved]);

    useEffect(() => {
        gameStateRef.current = { wsOpen, over };
    }, [wsOpen, over]);

    useEffect(() => {
        const handleKey = (e) => {
            let direction = '';
            switch (e.key) {
                case 'ArrowUp': direction = 'up'; break;
                case 'ArrowDown': direction = 'down'; break;
                case 'ArrowLeft': direction = 'left'; break;
                case 'ArrowRight': direction = 'right'; break;
                default: return;
            }
            e.preventDefault();

            const { over, inPlaybackMode, playbackIndex, aiMoves } = stateRef.current;

            if (!inPlaybackMode && !over) {
                sendMessage({ type: 'move', direction });
                return;
            }

            if (inPlaybackMode && playbackIndex < aiMoves.length - 1) {
                console.log("Player move blocked during AI playback.");
                return;
            }

            if (inPlaybackMode && playbackIndex === aiMoves.length - 1) {
                console.log("Final AI move reached. Player move will commit and resume gameplay.");
                const finalAIState = aiMoves[playbackIndex];
                sendMessage({
                    type: 'commit_ai_moves',
                    board: finalAIState.board,
                    score: finalAIState.score
                });
                sendMessage({ type: 'move', direction });
                setInPlaybackMode(false);
                setAiMoves([]);
            }
        }

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
                    wsUrl = `ws://127.0.0.1:8000/ws/game/?id=${connectionId}&session=${sessionId}`;
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
                            setInPlaybackMode(false); 
                            setBoard(data.board);
                            setScore(data.score);
                            setOver(data.over);
                            if (data.ai_assisted) {
                                setIsAiAssisted(true);
                            }
                            if (data.username) {
                                setUsername(data.username);
                            }
                            if (data.last_move) {
                                setAnimationKey(prev => prev + 1);
                                setLastMoveDirection(data.last_move);
                                
                                
                            }
                            if (onScoreUpdate) {
                                onScoreUpdate(data.score);
                            }
                        }
                        else if (data.type === "ai_move_sequence") {
                            if (data.moves && data.moves.length > 0) {
                                console.log("Received AI move sequence:", data.moves);
                                setAiMoves(data.moves);
                                setInPlaybackMode(true);
                                setPlaybackIndex(0);
                                setIsAiAssisted(true);
                            } else {
                                console.log("AI returned no valid moves.");
                            }
                        }
                        else if (data.type === "error") { 
                            console.error("Server Error:", data.message);
                            alert(`Error: ${data.message}`); 
                        }
                    } catch (err) {
                        console.error("Error parsing message:", err);
                    }
                };

                socket.onclose = (e) => {
                    if (!mounted) return;
                    setWsOpen(false);
                    console.log("%cWebSocket CLOSED", "color: orange;", "Code:", e.code);
                    
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
    }, [onScoreUpdate]); 
    
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
                if (!previousUsername && reconnectFnRef.current) {
                    console.log("New login detected - reconnecting");
                    setTimeout(() => reconnectFnRef.current(), 500);
                }
            } else {
                setUsername(null);
                if (previousUsername && reconnectFnRef.current) {
                    console.log("Logout detected - reconnecting");
                    setTimeout(() => reconnectFnRef.current(), 500);
                }
            }
        };
        
        window.addEventListener('auth-state-change', handleAuthChange);
        const authCheckInterval = setInterval(checkAuth, 30000);
        
        return () => {
            console.log("Auth effect cleanup");
            window.removeEventListener('auth-state-change', handleAuthChange);
            clearInterval(authCheckInterval);
        };
    }, []);

    const handleRestart = () => {
        setIsAiAssisted(false);
        sendMessage({ type: 'restart' });
    }

    const handleManualReconnect = () => {
        if (reconnectFnRef.current) {
            reconnectFnRef.current();
        }
    };

    const displayBoard = 
        inPlaybackMode && aiMoves.length > 0
        ? aiMoves[playbackIndex].board 
        : board;

    const displayScore = 
        inPlaybackMode && aiMoves.length > 0
        ? aiMoves[playbackIndex].score
        : score;

    // Get the direction to display - either from AI playback or regular gameplay
    const currentMoveDirection = 
        inPlaybackMode && aiMoves.length > 0
        ? aiMoves[playbackIndex]?.move_made
        : lastMoveDirection;

    // Function to generate directional glow classes
    // const getDirectionalGlow = (direction) => {
    //     if (!direction) return '';
        
    //     const glowBase = 'transition-all duration-400';
        
    //     switch(direction) {
    //         case 'up':
    //             return `${glowBase} shadow-[0_-8px_24px_-4px_rgba(34,211,238,0.6)] border-t-2 border-t-cyan-400/50`;
    //         case 'down':
    //             return `${glowBase} shadow-[0_8px_24px_-4px_rgba(34,211,238,0.6)] border-b-2 border-b-cyan-400/50`;
    //         case 'left':
    //             return `${glowBase} shadow-[-8px_0_24px_-4px_rgba(34,211,238,0.6)] border-l-2 border-l-cyan-400/50`;
    //         case 'right':
    //             return `${glowBase} shadow-[8px_0_24px_-4px_rgba(34,211,238,0.6)] border-r-2 border-r-cyan-400/50`;
    //         default:
    //             return glowBase;
    //     }
    // };
    const getDirectionalGlow = (direction) => {
        if (!direction) return '';
        switch(direction) {
            case 'up': return 'glow-up border-t-cyan-400/30';
            case 'down': return 'glow-down border-b-cyan-400/30';
            case 'left': return 'glow-left border-l-cyan-400/30';
            case 'right': return 'glow-right border-r-cyan-400/30';
            default: return '';
        }
    };
  

    return (
        <div className="bg-slate-800/50 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-slate-700/40 w-full max-w-xl">
            {/* Connection Status - Top Center */}
            
            
            {over && 
                <div className="p-4 bg-red-900/30 border border-red-500/40 text-red-300 rounded-lg mb-4 text-center backdrop-blur-sm">
                    <h3 className="text-2xl font-extrabold">Game Over!</h3>
                    <p className="text-lg">Final Score: {displayScore}</p>
                    {saveMessage && (
                        <p className="mt-2 text-green-400 font-bold">{saveMessage}</p>
                    )}
                </div>
            }

            {inPlaybackMode ? (
                <div className="bg-purple-900/30 border-2 border-purple-500/40 p-4 rounded-lg mb-4 text-center backdrop-blur-sm">
                    <h4 className="text-lg font-bold text-purple-300">Playback Mode</h4>
                    <div className="flex justify-center items-center gap-4 mt-3">
                        <button 
                            onClick={handlePreviousMove} 
                            disabled={playbackIndex === 0}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold transition hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            &larr; Previous
                        </button>
                        <span className="font-mono text-lg text-purple-300">
                            Move {playbackIndex + 1} / {aiMoves.length}
                        </span>
                        <button 
                            onClick={handleNextMove}
                            disabled={playbackIndex >= aiMoves.length - 1}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold transition hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Next &rarr;
                        </button>
                    </div>
                    {playbackIndex < aiMoves.length - 1 && (
                        <div className="mt-3">
                             <button 
                                onClick={handleSkipToEnd} 
                                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-semibold transition"
                            >
                                Skip &raquo;
                            </button>
                        </div>
                    )}
                    {playbackIndex === aiMoves.length - 1 && (
                        <p className="text-sm text-green-400 mt-2 font-semibold">
                            You are at the final move. Use arrow keys to continue playing.
                        </p>
                    )}
                </div>
            ) : (
            <div className="flex justify-center mb-6">
                <div className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    wsOpen 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                    Connection: {wsOpen ? 'Live' : 'Closed'}
                </div>
            </div>)}
            
            {/* Game Board */}
            <div key = {animationKey} 
                className={`grid grid-cols-4 gap-3 w-full p-4 bg-slate-700/50 rounded-xl shadow-inner mb-6 ${getDirectionalGlow(currentMoveDirection)}`}>
                {displayBoard.flat().map((cell, idx) => {
                    const isMegaTile = cell >= 4096;
                    const fontSize = cell >= 8192 ? 'text-xl' : cell >= 1024 ? 'text-2xl' : 'text-3xl';
                    
                    return (
                        <div 
                            key={idx} 
                            className={`w-full aspect-square flex items-center justify-center rounded-lg ${fontSize} font-bold transition-all duration-200 transform ${getTileColor(cell)} ${isMegaTile ? 'animate-pulse' : ''}`}
                            style={{ 
                                transform: cell > 0 ? 'scale(1)' : 'scale(0.8)', 
                                opacity: cell > 0 ? 1 : 0.5 
                            }}
                        >
                            {cell > 0 ? (
                                <>
                                    {cell}
                                    {cell === 2048 && <span className="absolute text-xs mt-8">🎉</span>}
                                    {cell === 4096 && <span className="absolute text-xs mt-8">🔥</span>}
                                    {cell >= 8192 && <span className="absolute text-xs mt-8">👑</span>}
                                </>
                            ) : ''}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Buttons */}
            {!inPlaybackMode ? (
                <div className="flex gap-3 justify-center">
                {/* <button 
                    className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md border border-blue-500/30"
                    disabled={!wsOpen}
                >
                    Get AI Moves
                </button> */}
                <button 
                    onClick={handleRestart} 
                    className="flex-1 bg-green-600/80 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md border border-green-500/30"
                    disabled={!wsOpen}
                >
                    Restart Game
                </button>
                
            </div>
            ) : null}
            
        </div>
    )
});

export default GameBoard;