import { useState } from 'react'
import GameBoard from "./Components/GameBoard.jsx"; // Added .jsx extension
import AIList from "./Components/AIList.jsx"; // Added .jsx extension
import Leaderboard from "./Components/Leaderboard.jsx"; // Added .jsx extension
import Login from "./Components/Login.jsx"; // Added .jsx extension
import Register from "./Components/Register.jsx"; // Added .jsx extension
import { logoutUser } from './api/api.js' // Added .js extension

// Define the localStorage key used for the game state (critical for persistence fix)
const GAME_STATE_STORAGE_KEY = 'gameBoardState';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // This ID is used for routing/endpoint identification, not game state itself.
  const GAME_ENDPOINT_ID = "game_instance"; 

  // Handlers for successful auth: simply set authenticated state to true.
  // NOTE: Clearing local storage must be done inside Login/Register components
  // for when a new user signs in without logging out the previous session.
  const handleLoginSuccess = () => setAuthenticated(true);
  const handleRegisterSuccess = () => setAuthenticated(true);

  const handleLogout = async () => {
    // 1. Call the backend to destroy the server session
    await logoutUser();
    
    // 2. *** CRITICAL FIX: Clear the local game state when the user logs out ***
    // This ensures no previous user's game data is shown to the next user, 
    // and forces the app to fetch the correct state if the user logs back in.
    localStorage.removeItem(GAME_STATE_STORAGE_KEY); 
    
    // 3. Reset the component's authentication state
    setAuthenticated(false);
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Game and Auth Area */}
        <div className="flex-grow lg:w-3/4">
          {!authenticated ? (
            <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-blue-500">
              <div className="mb-4 flex justify-center">
                <button 
                  onClick={() => setShowRegister(false)} 
                  className={`px-6 py-2 rounded-l-lg font-semibold transition-all duration-200 ${!showRegister ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setShowRegister(true)} 
                  className={`px-6 py-2 rounded-r-lg font-semibold transition-all duration-200 ${showRegister ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Register
                </button>
              </div>
              
              <div className="flex justify-center">
                {showRegister ? (
                  <Register onSuccess={handleRegisterSuccess} />
                ) : (
                  // Pass handleLoginSuccess, which will trigger the state change here
                  <Login onSuccess={handleLoginSuccess} />
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 p-4 bg-white shadow-lg rounded-xl">
                <h1 className="text-3xl font-extrabold text-gray-800">2048 Pro</h1>
                <button 
                  onClick={handleLogout} 
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-semibold transition duration-300 shadow-md"
                >
                  Logout
                </button>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3">
                  <GameBoard gameId={GAME_ENDPOINT_ID} />
                </div>
                <div className="lg:w-1/3">
                  <AIList onStartAI={() => {}} />
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Leaderboard Area */}
        <div className="lg:w-1/4">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
