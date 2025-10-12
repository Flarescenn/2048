import { useEffect, useState } from "react";
import { getLeaderboard } from "../api/api";

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadLeaderboard = async () => {
        if (!refreshing) {
            setLoading(true);
        }
        setError(null);
        
        console.log("Fetching leaderboard data...");
        try {
            const result = await getLeaderboard('high_score', 10);
            console.log("Leaderboard API response:", result);

            if (result.success) {
                console.log("Leaderboard data loaded successfully:", result.data);
                setLeaders(result.data);
            } else {
                console.error("Failed to load leaderboard:", result.error);
                setError(result.error || 'Could not load leaderboard.');
            }
        } catch (err) {
            console.error("Exception during leaderboard fetch:", err);
            setError("Network error while loading leaderboard.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        console.log("Leaderboard: Setting up (should see this ONCE)");
        loadLeaderboard();
        
        // Listen for game completion to refresh leaderboard
        const handleGameCompleted = () => {
            console.log("Game completed - refreshing leaderboard");
            setRefreshing(true);
            loadLeaderboard();
        };
        
        window.addEventListener('game-completed', handleGameCompleted);
        
        // Auto-refresh every 60 seconds
        const intervalId = setInterval(() => {
            console.log("Leaderboard: Auto-refresh triggered");
            setRefreshing(true);
            loadLeaderboard();
        }, 60000);
        
        return () => {
            console.log("Leaderboard: Cleanup");
            window.removeEventListener('game-completed', handleGameCompleted);
            clearInterval(intervalId);
        };
    }, []);

    const handleManualRefresh = () => {
        setRefreshing(true);
        loadLeaderboard();
    };

    // --- Conditional Rendering ---
    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <div className="flex items-center justify-center p-4">
                    <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading leaderboard...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            );
        }
        
        if (leaders.length === 0) {
            return (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
                    <span className="block sm:inline">No games recorded yet. Play to be first on the leaderboard!</span>
                </div>
            );
        }

        return (
            <div className="overflow-hidden">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr className="bg-gray-100 text-gray-700 text-left">
                            <th className="py-2 px-3 w-8">#</th>
                            <th className="py-2 px-3">Player</th>
                            <th className="py-2 px-3 text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaders.map((game, idx) => (
                            <tr 
                                key={idx} 
                                className={`${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : ''} 
                                         border-b hover:bg-gray-50 transition-colors`}
                            >
                                <td className="py-2 px-3 font-bold text-gray-700">{game.rank || idx + 1}</td>
                                <td className="py-2 px-3 font-medium">
                                    {game.user}
                                    {game.games_played && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            ({game.games_played} games)
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 px-3 text-right font-bold">
                                    {game.high_score || game.score}
                                    {game.points && (
                                        <div className="text-xs text-blue-600">{game.points} pts</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-blue-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Top Scores</h3>
                <button 
                    onClick={handleManualRefresh}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center disabled:opacity-50"
                    disabled={loading || refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                    {refreshing && (
                        <svg className="animate-spin ml-1 h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                </button>
            </div>
            
            {renderContent()}
        </div>
    );
}