import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../api/api"; // Ensure the path is correct

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadLeaderboard = async () => {
            setLoading(true);
            setError(null);
            
            // 1. Use the structured response from the robust API function
            const result = await fetchLeaderboard();

            if (result.success) {
                setLeaders(result.data);
            } else {
                // Set an error message if the API call failed
                setError(result.error || 'Could not load leaderboard.');
            }
            setLoading(false);
        };

        loadLeaderboard();
    }, []);

    // --- Conditional Rendering ---

    if (loading) {
        return (
            <div>
                <h3>Leaderboards</h3>
                <p>Loading leaderboard data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h3>Leaderboards</h3>
                <p style={{ color: 'red' }}>Error: {error}</p>
            </div>
        );
    }
    
    if (leaders.length === 0) {
        return (
            <div>
                <h3>Leaderboards</h3>
                <p>No games have been recorded yet.</p>
            </div>
        );
    }

    // --- Successful Rendering ---

    return (
        <div>
            <h3>Leaderboards</h3>
            <ol>
                {/* 2. CRITICAL FIX: The map function must explicitly RETURN the JSX element */}
                {leaders.map((game, idx) => (
                    <li key={idx}>
                        {/* Assuming game.user is the username string */}
                        <strong>{game.user}</strong> - {game.score} pts - {game.mode}
                        {game.ai_model ? ` (AI: ${game.ai_model})` : ""}
                    </li>
                ))}
            </ol>
        </div>
    );
}