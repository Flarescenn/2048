import { useState, useEffect } from 'react'
import GameBoard from "./Components/GameBoard.jsx";
import AIList from "./Components/AIList.jsx";
import Leaderboard from "./Components/Leaderboard.jsx";
import Login from "./Components/Login.jsx";
import Register from "./Components/Register.jsx";
import { logoutUser, fetchCurrentUser } from './api/api.js' 

// Define the localStorage key used for the game state
const GAME_STATE_STORAGE_KEY = 'gameBoardState';

export default function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); 
    const [loading, setLoading] = useState(true); 
    // NEW STATE: To track the current game score
    const [currentGameScore, setCurrentGameScore] = useState(0); 

    const GAME_ENDPOINT_ID = "game_instance"; 

    // CRITICAL FIX: Check authentication status when the app loads
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await fetchCurrentUser(); 
                if (user && user.username) {
                    setAuthenticated(true);
                    setCurrentUser(user); 
                } else {
                    setAuthenticated(false);
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Authentication check failed:", error);
                setAuthenticated(false);
                setCurrentUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []); 


    // Handlers for successful auth: set authenticated state and store user data
    const handleAuthSuccess = (userData) => {
        setAuthenticated(true);
        setCurrentUser(userData);
    };

    const handleLogout = async () => {
        await logoutUser();
        localStorage.removeItem(GAME_STATE_STORAGE_KEY);
        setAuthenticated(false);
        setCurrentUser(null);
        setCurrentGameScore(0); // Reset score on logout
    }
    
    // NEW HANDLER: This function is passed to GameBoard to receive score updates
    const handleScoreUpdate = (newScore) => {
        setCurrentGameScore(newScore);
    };
    
    if (loading) {
        return <div className="p-10 text-center text-xl">Loading application...</div>;
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
                                    <Register onSuccess={handleAuthSuccess} />
                                ) : (
                                    <Login onSuccess={handleAuthSuccess} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 p-4 bg-white shadow-lg rounded-xl">
                                <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-4">
                                    <span>Welcome, <span className="text-blue-600">{currentUser?.username || 'Player'}</span>!</span>
                                    
                                    {/* SCORE DISPLAY: Show the current game score */}
                                    <span className="text-sm px-4 py-2 bg-yellow-500 text-white rounded-xl shadow-md font-extrabold">
                                        CURRENT SCORE: {currentGameScore}
                                    </span>
                                </h1>
                                <button 
                                    onClick={handleLogout} 
                                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-semibold transition duration-300 shadow-md"
                                >
                                    Logout
                                </button>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="lg:w-2/3">
                                    {/* PASS THE HANDLER: GameBoard calls this function to update the score */}
                                    <GameBoard 
                                        gameId={GAME_ENDPOINT_ID} 
                                        onScoreUpdate={handleScoreUpdate} // <-- NEW PROP
                                    /> 
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