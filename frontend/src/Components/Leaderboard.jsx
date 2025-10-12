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
                console.log("Leaderboard entries:", JSON.stringify(result.data, null, 2));
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
        
        const handleGameCompleted = () => {
            console.log("Game completed - refreshing leaderboard");
            setRefreshing(true);
            loadLeaderboard();
        };
        
        window.addEventListener('game-completed', handleGameCompleted);
        
        const intervalId = setInterval(() => {
            console.log("Leaderboard: Auto-refresh triggered");
            setRefreshing(true);
            loadLeaderboard();
        }, 120000);
        
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

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <div className="flex items-center justify-center p-8 text-gray-400">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </div>
            );
        }
        
        if (leaders.length === 0) {
            return (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg text-center">
                    <span>No games yet. Be the first!</span>
                </div>
            );
        }

        const getRankIcon = (rank) => {
            if (rank === 1) return '🥇';
            if (rank === 2) return '🥈';
            if (rank === 3) return '🥉';
            return null;
        };

        return (
            <div className="space-y-2">
                {leaders.map((game, idx) => {
                    const rank = game.rank || idx + 1;
                    const isTop3 = rank <= 3;
                    
                    return (
                        <div 
                            key={idx} 
                            className={`p-3 rounded-lg transition-all ${
                                rank === 1 
                                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30' 
                                    : rank === 2
                                    ? 'bg-gradient-to-r from-slate-400/20 to-gray-400/20 border border-slate-400/30'
                                    : rank === 3
                                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-600/20 border border-orange-500/30'
                                    : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`flex-shrink-0 w-8 text-center font-bold ${
                                        isTop3 ? 'text-xl' : 'text-gray-400'
                                    }`}>
                                        {getRankIcon(rank) || `#${rank}`}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-200 truncate">
                                            {game.user}
                                        </div>
                                        {game.games_played && (
                                            <div className="text-xs text-gray-500">
                                                {game.games_played} games
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-right flex-shrink-0">
                                    <div className={`font-bold text-lg ${
                                        rank === 1 ? 'text-yellow-400' :
                                        rank === 2 ? 'text-slate-300' :
                                        rank === 3 ? 'text-orange-400' :
                                        'text-blue-400'
                                    }`}>
                                        {game.high_score?.toLocaleString() || 0}
                                    </div>
                                    {game.points && (
                                        <div className="text-xs text-gray-500">
                                            {game.points} pts
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-200">Top Players</h3>
                <button 
                    onClick={handleManualRefresh}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 transition-all"
                    disabled={loading || refreshing}
                >
                    {refreshing ? (
                        <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Refreshing</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Refresh</span>
                        </>
                    )}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
}