// frontend/src/Components/UserStats.jsx

import { useState, useEffect } from "react";
import { getUserStats } from "../api/api";

export default function UserStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        const result = await getUserStats();
        if (result.success) {
            setStats(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadStats();
        
        // Listen for game completion events to refresh stats
        const handleGameCompleted = () => {
            console.log('Game completed event received - refreshing stats');
            loadStats();
        };
        
        window.addEventListener('game-completed', handleGameCompleted);
        
        return () => {
            window.removeEventListener('game-completed', handleGameCompleted);
        };
    }, []);

    if (loading) {
        return (
            <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-purple-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Stats</h3>
                <p className="text-gray-600">Loading...</p>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-purple-500">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Your Stats</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-semibold">Total Points</p>
                    <p className="text-3xl font-extrabold text-blue-800">{stats.points}</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
                    <p className="text-sm text-yellow-600 font-semibold">High Score</p>
                    <p className="text-3xl font-extrabold text-yellow-800">{stats.high_score}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-semibold">Games Played</p>
                    <p className="text-3xl font-extrabold text-green-800">{stats.games_played}</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-semibold">Avg Score</p>
                    <p className="text-3xl font-extrabold text-purple-800">{stats.average_score}</p>
                </div>
            </div>
            
            {stats.recent_games && stats.recent_games.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Recent Games</h4>
                    <div className="space-y-1">
                        {stats.recent_games.map((game, idx) => (
                            <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                <span className="text-gray-600">Score: {game.score}</span>
                                <span className="text-gray-400 text-xs">
                                    {new Date(game.date).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}