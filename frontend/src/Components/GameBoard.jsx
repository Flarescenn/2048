import { useState, useEffect, useRef } from "react";
import AIList from './AIList'; 

// Helper function to get a color based on the tile value
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
    const wsRef = useRef(null);
    const [wsOpen, setWsOpen] = useState(false);

    const startAI = (model) => {
        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "start_ai", agent: model }));
        } else {
            console.error("WebSocket connection is not open or not established yet.");
        }
    };

     useEffect(() => {
        let mounted = true; 

        // Helper to get cookies
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        };
        
        const sessionCookie = getCookie('sessionid');
        const csrfToken = getCookie('csrftoken');
        
        if (!sessionCookie) {
            console.error('No session cookie found - user might not be logged in');
            return;
        }
        
        // CRITICAL FIX: Correct WebSocket URL path now matches the routing.py
        const wsUrl = `ws://localhost:8000/ws/game/?session=${sessionCookie}&csrf=${csrfToken}`;

        console.log('WebSocket URL (final):', wsUrl);
        console.log('Session cookie:', sessionCookie);

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
            if (!mounted) return; 
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
            if (mounted) setWsOpen(false);
        };
        socket.onerror = (e) => {
            console.error("WebSocket Error:", e);
        };


        const handleKey = (e) => {
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
            window.removeEventListener("keydown", handleKey);

            const s = wsRef.current;
            if (s && s.readyState === WebSocket.CONNECTING) {
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
                setWsOpen(false);
            }
        };
    }, [over]);

    return (
        <div className="flex flex-col items-center p-4">
            <h2 className="text-2xl font-bold mb-4">Score: {score}</h2>
            {over && <h3 className="text-red-600 font-extrabold text-4xl mb-4">Game Over</h3>}
            
            {/* RENDER THE AIList COMPONENT AND PASS startAI */}
            {/* If AIList takes too much space, uncomment this: <AIList onStartAI={startAI} /> */} 
            
            <div className="grid grid-cols-4 gap-2 w-64 p-2 bg-gray-400 rounded-lg shadow-lg">
                {board.flat().map((cell, idx) => {
                    const tileClasses = getTileColor(cell); 
                    
                    return (
                        <div 
                            key={idx}
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