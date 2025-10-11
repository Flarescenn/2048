import { useState } from 'react'
import GameBoard from "./Components/GameBoard";
import AIList from "./Components/AIList";
import Leaderboard from "./Components/Leaderboard";
import Login from "./Components/Login";
import Register from "./Components/Register";
import { logoutUser } from './api/api'

export default function App() {
  // 1. REMOVED: const [sessionId] = useState("demo123"); 
  const [authenticated, setAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // We still need a placeholder to satisfy the GameBoard prop requirement,
  // but we won't display it or rely on it.
  const GAME_ENDPOINT_ID = "game_instance"; 

  const handleLoginSuccess = () => setAuthenticated(true);
  const handleRegisterSuccess = () => setAuthenticated(true);

  const handleLogout = async () => {
    await logoutUser();
    setAuthenticated(false);
  }

  return (
    <div className="flex gap-4 p-4">
      <div>
        {!authenticated ? (
          <div className="p-4">
            <div className="mb-2">
              <button onClick={() => setShowRegister(false)} className={`px-3 py-1 mr-2 ${!showRegister ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Login</button>
              <button onClick={() => setShowRegister(true)} className={`px-3 py-1 ${showRegister ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Register</button>
            </div>
            {showRegister ? (
              <Register onSuccess={handleRegisterSuccess} />
            ) : (
              <Login onSuccess={handleLoginSuccess} />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end mb-4">
              {/* REMOVED: The session display placeholder */}
              <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
            </div>
            {/* Pass the generic endpoint ID. Its value is irrelevant to game state. */}
            <GameBoard  />
            <AIList onStartAI={() => {}} />
          </>
        )}
      </div>
      <div>
        <Leaderboard />
      </div>
    </div>
  );
}
// Save this file as App.jsx