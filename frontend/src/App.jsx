import { useState, useEffect, useRef } from 'react'
import GameBoard from "./Components/GameBoard.jsx";
import AIList from "./Components/AIList.jsx";
import Leaderboard from "./Components/Leaderboard.jsx";
import UserStats from "./Components/UserStats.jsx";
import Login from "./Components/Login.jsx";
import Register from "./Components/Register.jsx";
import { logoutUser, fetchCurrentUser } from './api/api.js' 

const GAME_STATE_STORAGE_KEY = 'gameBoardState';

export default function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); 
    const [loading, setLoading] = useState(true); 
    const [currentGameScore, setCurrentGameScore] = useState(0); 

    // Use refs to track state for the auth event dispatcher
    const authStateRef = useRef({ authenticated: false, username: null });

    const GAME_ENDPOINT_ID = "game_instance"; 

    // Auth check effect - ONLY runs once on mount
    useEffect(() => {
        console.log("App.jsx: Setting up authentication monitoring (should see this ONCE)");
        
        const dispatchAuthEvent = (isAuthenticated, userData) => {
            const authEvent = new CustomEvent('auth-state-change', {
                detail: {
                    authenticated: isAuthenticated,
                    user: userData
                }
            });
            console.log(`Dispatching auth event: authenticated=${isAuthenticated}, user=${userData?.username || 'none'}`);
            window.dispatchEvent(authEvent);
        };

        const checkAuth = async () => {
            try {
                const user = await fetchCurrentUser(); 
                
                // Use refs to check if state actually changed
                const wasAuthenticated = authStateRef.current.authenticated;
                const prevUsername = authStateRef.current.username;

                if (user && user.username) {
                    console.log("User authenticated:", user.username);
                    setAuthenticated(true);
                    setCurrentUser(user);
                    
                    // Update ref
                    authStateRef.current = { authenticated: true, username: user.username };
                    
                    // Dispatch event only if auth state changed
                    if (!wasAuthenticated || prevUsername !== user.username) {
                        dispatchAuthEvent(true, user);
                    }
                } else {
                    console.log("No authenticated user found");
                    setAuthenticated(false);
                    setCurrentUser(null);
                    
                    // Update ref
                    authStateRef.current = { authenticated: false, username: null };
                    
                    // Dispatch event only if auth state changed
                    if (wasAuthenticated) {
                        dispatchAuthEvent(false, null);
                    }
                }
            } catch (error) {
                console.error("Authentication check failed:", error);
                setAuthenticated(false);
                setCurrentUser(null);
                authStateRef.current = { authenticated: false, username: null };
                
                // Dispatch event on error only if previously authenticated
                if (authStateRef.current.authenticated) {
                    dispatchAuthEvent(false, null);
                }
            } finally {
                setLoading(false);
            }
        };
        
        // Initial authentication check
        checkAuth();
        
        // Set up periodic authentication check every 30 seconds (not 3!)
        const authCheckInterval = setInterval(checkAuth, 30000);
        
        // Clean up interval on component unmount
        return () => {
            console.log("App.jsx: Cleaning up auth monitoring");
            clearInterval(authCheckInterval);
        };
    }, []); // ✅ EMPTY DEPENDENCY ARRAY - only run once!

    // Handlers for successful auth: set authenticated state and store user data
    const handleAuthSuccess = (userData) => {
        console.log("Auth success handler called with:", userData);
        setAuthenticated(true);
        setCurrentUser(userData);
        authStateRef.current = { authenticated: true, username: userData.username };
    };

    const handleLogout = async () => {
        try {
            console.log("Logging out user...");
            await logoutUser();
            console.log("Logout successful, clearing user state");
            
            // Update local state
            setAuthenticated(false);
            setCurrentUser(null);
            setCurrentGameScore(0);
            authStateRef.current = { authenticated: false, username: null };
            
            // Dispatch logout event
            const authEvent = new CustomEvent('auth-state-change', {
                detail: { authenticated: false, user: null }
            });
            window.dispatchEvent(authEvent);
            
            // Force an immediate auth check after logout
            setTimeout(async () => {
                try {
                    console.log("Post-logout authentication check");
                    const user = await fetchCurrentUser();
                    if (user && user.username) {
                        console.warn("User still authenticated after logout!");
                        setAuthenticated(true);
                        setCurrentUser(user);
                        authStateRef.current = { authenticated: true, username: user.username };
                    } else {
                        console.log("User confirmed logged out");
                    }
                } catch (error) {
                    console.error("Post-logout auth check failed:", error);
                }
            }, 500);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
    
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
                                    
                                    {/* Show user points */}
                                    {currentUser?.points !== undefined && (
                                        <span className="text-sm px-4 py-2 bg-blue-500 text-white rounded-xl shadow-md font-extrabold">
                                            💰 {currentUser.points} Points
                                        </span>
                                    )}
                                    
                                    {/* Show current game score */}
                                    <span className="text-sm px-4 py-2 bg-yellow-500 text-white rounded-xl shadow-md font-extrabold">
                                        🎮 Score: {currentGameScore}
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
                                <div className="lg:w-2/3 space-y-6">
                                    <GameBoard 
                                        gameId={GAME_ENDPOINT_ID} 
                                        onScoreUpdate={handleScoreUpdate}
                                    />
                                    <UserStats />
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