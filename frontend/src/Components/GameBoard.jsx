import { useState, useEffect, useRef } from "react";
import AIList from './AIList'; 

// Helper function to get a color based on the tile value (retained from your preferred styling)
const getTileColor = (value) => {
    switch (value) {
        case 0: return 'bg-gray-300';
        case 2: return 'bg-[#eee4da]';
        case 4: return 'bg-[#ede0c8]';
        case 8: return 'bg-[#f2b179] text-white';
        case 16: return 'bg-[#f59563] text-white';
        case 32: return 'bg-[#f67c5f] text-white';
        case 64: return 'bg-[#f65e3b] text-white';
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
            return 'bg-yellow-400 text-white'; 
        default: return 'bg-gray-500 text-white';
    }
};

export default function Gameboard(){
    const [board, setBoard] = useState(Array(4).fill(null).map(() => Array(4).fill(0)))
    const [score, setScore] = useState(0)
    const [over, setOver] = useState(false)
    // 1. REF TO HOLD THE WEBSOCKET CONNECTION (stable across renders)
    const wsRef = useRef(null);
    // Local state for UI only (not relied on for sending)
    const [wsOpen, setWsOpen] = useState(false);

    // 2. FUNCTION TO SEND THE AI START MESSAGE
    const startAI = (model) => {
        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "start_ai", agent: model }));
        } else {
            console.error("WebSocket connection is not open or not established yet.");
        }
    };

     useEffect(() => {
        let mounted = true; // track mounted state to avoid setting state after unmount

        // Get session cookie manually and add to WebSocket URL as query param
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        };
        
        // Ensure we have both session and CSRF cookies
        const sessionCookie = getCookie('sessionid');
        const csrfToken = getCookie('csrftoken');
        
        if (!sessionCookie) {
            console.error('No session cookie found - user might not be logged in');
            return;
        }
        
        // For WebSockets, we need to use the direct URL instead of going through the Vite proxy
        // const wsUrl = `${import.meta.env.VITE_WS_BASE}/ws/game/${sessionId}/?session=${sessionCookie}&csrf=${csrfToken}`;
        const wsUrl = `ws://localhost:8000/ws/game/demo123/?session=${sessionCookie}&csrf=${csrfToken}`;

        console.log('WebSocket URL:', wsUrl);
        console.log('Session cookie:', sessionCookie);

        const socket = new WebSocket(wsUrl);
        // store immediately so handlers/cleanup can reference the same object
        wsRef.current = socket;

        socket.onopen = () => {
            if (!mounted) return; // ignore if unmounted during connect
            setWsOpen(true);
            console.log("WebSocket connection established successfully.");
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "init" || data.type === "update") {
                setBoard(data.board);
                setScore(data.score);
                setOver(data.over);
            }
        };

        // Optional: Add onerror/onclose handlers for better debugging
       socket.onclose = (e) => {
           console.log(`WebSocket Closed (Code: ${e.code}, Reason: ${e.reason || 'No Reason'}).`);
           // reflect closed state
           if (mounted) setWsOpen(false);
       };
       socket.onerror = (e) => {
           console.error("WebSocket Error:", e);
       };


        const handleKey = (e) => {
            // Use 'socket' here, which is the local variable for the connection
            if (over || !socket || socket.readyState !== WebSocket.OPEN) return; 
            
            let dir = null;
            if (e.key === "ArrowUp") dir = "up";
            else if (e.key === "ArrowDown") dir = "down";
            else if (e.key === "ArrowLeft") dir = "left";
            else if (e.key === "ArrowRight") dir = "right";
            
            if (dir) {
                e.preventDefault(); 
                socket.send(JSON.stringify({ type: "move", direction: dir }));
            }
        };
        
        window.addEventListener("keydown", handleKey);

        // Cleanup function: Close the socket and remove listener
        return () => {
            mounted = false;
            // Remove event listener first
            window.removeEventListener("keydown", handleKey);

            // If socket still exists and is not already closed, close it.
            // Avoid calling close() on a socket that is in CLOSING/CLOSED state to prevent the warning.
            const s = wsRef.current;
            if (s && s.readyState === WebSocket.CONNECTING) {
                // If still connecting, give it a small chance to open and then close gracefully.
                // But in Strict Mode React may call mount/unmount quickly; safest is to remove handlers and
                // simply null out the ref so any eventual open doesn't try to set state on unmounted component.
                s.onopen = null;
                s.onmessage = null;
                s.onclose = null;
                s.onerror = null;
                wsRef.current = null;
            } else if (s && s.readyState === WebSocket.OPEN) {
                s.close();
                wsRef.current = null;
            } else {
                wsRef.current = null;
            }
            if (mounted === false) {
                // ensure UI state shows closed
                setWsOpen(false);
            }
        };
    }, [over]); // Dependency array: only re-run if sessionId or over changes

    return (
        <div className="flex flex-col items-center p-4">
            <h2 className="text-2xl font-bold mb-4">Score: {score}</h2>
            {over && <h3 className="text-red-600 font-extrabold text-4xl mb-4">Game Over</h3>}
            
            {/* 3. RENDER THE AIList COMPONENT AND PASS startAI */}
            {/* <AIList onStartAI={startAI} /> */} 
            
            <div className="grid grid-cols-4 gap-2 w-64 p-2 bg-gray-400 rounded-lg shadow-lg">
                {board.flat().map((cell, idx) => {
                    const tileClasses = getTileColor(cell); 
                    
                    return (
                        <div 
                            key={idx}
                            // Fixed layout classes
                            className={`w-full aspect-square flex items-center justify-center font-bold text-2xl rounded-md transition-all duration-100 ${tileClasses}`}
                        >
                            {cell !== 0 ? cell : ""} 
                        </div>
                    );
                })}
            </div>
        </div>
    )
}