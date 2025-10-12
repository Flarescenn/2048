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

    const authStateRef = useRef({ authenticated: false, username: null });
    const GAME_ENDPOINT_ID = "game_instance"; 

    const gameBoardRef = useRef(null);

    // 2. Define the handler function for the assist feature
    const handleStartAssist = (agentName, moves) => {
        if (gameBoardRef.current) {
            gameBoardRef.current.startAssist(agentName, moves);
        }
    };
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
                
                const wasAuthenticated = authStateRef.current.authenticated;
                const prevUsername = authStateRef.current.username;

                if (user && user.username) {
                    console.log("User authenticated:", user.username);
                    setAuthenticated(true);
                    setCurrentUser(user);
                    
                    authStateRef.current = { authenticated: true, username: user.username };
                    
                    if (!wasAuthenticated || prevUsername !== user.username) {
                        dispatchAuthEvent(true, user);
                    }
                } else {
                    console.log("No authenticated user found");
                    setAuthenticated(false);
                    setCurrentUser(null);
                    
                    authStateRef.current = { authenticated: false, username: null };
                    
                    if (wasAuthenticated) {
                        dispatchAuthEvent(false, null);
                    }
                }
            } catch (error) {
                console.error("Authentication check failed:", error);
                setAuthenticated(false);
                setCurrentUser(null);
                authStateRef.current = { authenticated: false, username: null };
                
                if (authStateRef.current.authenticated) {
                    dispatchAuthEvent(false, null);
                }
            } finally {
                setLoading(false);
            }
        };
        
        checkAuth();
        const authCheckInterval = setInterval(checkAuth, 30000);
        
        return () => {
            console.log("App.jsx: Cleaning up auth monitoring");
            clearInterval(authCheckInterval);
        };
    }, []);

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
            
            setAuthenticated(false);
            setCurrentUser(null);
            setCurrentGameScore(0);
            authStateRef.current = { authenticated: false, username: null };
            
            const authEvent = new CustomEvent('auth-state-change', {
                detail: { authenticated: false, user: null }
            });
            window.dispatchEvent(authEvent);
            
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
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
                <div className="text-gray-300 text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
            <div className="w-full h-full px-4 py-4">
                
                {!authenticated ? (
                    <div className="flex items-center justify-center min-h-screen -mt-20">
                        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
                            <div className="mb-6 flex gap-2 p-1 bg-slate-900/50 rounded-xl">
                                <button 
                                    onClick={() => setShowRegister(false)} 
                                    className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all ${!showRegister ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Login
                                </button>
                                <button 
                                    onClick={() => setShowRegister(true)} 
                                    className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-all ${showRegister ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Register
                                </button>
                            </div>
                            
                            {showRegister ? (
                                <Register onSuccess={handleAuthSuccess} />
                            ) : (
                                <Login onSuccess={handleAuthSuccess} />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 p-4 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-4">
                                <div className="text-gray-200">
                                    <span className="text-sm text-gray-400">Welcome back,</span>
                                    <div className="text-xl font-semibold text-blue-400">
                                        {currentUser?.username || 'Player'}
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 ml-4">
                                    {currentUser?.points !== undefined && (
                                        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg">
                                            <div className="text-xs text-amber-400/70 font-medium">Balance</div>
                                            <div className="text-lg font-bold text-amber-400">{currentUser.points}</div>
                                        </div>
                                    )}
                                    
                                    <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg">
                                        <div className="text-xs text-blue-400/70 font-medium">Score</div>
                                        <div className="text-lg font-bold text-blue-400">{currentGameScore}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleLogout} 
                                className="px-5 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-medium transition-all border border-red-500/30"
                            >
                                Logout
                            </button>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-12 gap-4">
                            <div className="col-span-7 flex flex-col gap-4">
                                <div className="flex-1">
                                    <GameBoard 
                                        ref={gameBoardRef}
                                        gameId={GAME_ENDPOINT_ID} 
                                        onScoreUpdate={handleScoreUpdate}
                                    />
                                </div>
                                <div className="h-auto">
                                    <UserStats />
                                </div>
                            </div>
                            
                            <div className="col-span-2">
                                <AIList onStartAssist = {handleStartAssist} />
                            </div>
                            
                            <div className="col-span-3">
                                <Leaderboard /> 
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}