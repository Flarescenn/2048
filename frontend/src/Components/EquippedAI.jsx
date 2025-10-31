// In frontend/src/Components/EquippedAI.jsx

import { useState, useEffect } from 'react';
// We will create these API functions soon
import { getUserAiProfile } from '../api/api'; 

export default function EquippedAI({ onOpenDrawer, onStartAI }) {
    const [equippedAI, setEquippedAI] = useState(null);
    const [loading, setLoading] = useState(true);
    const [numMoves, setNumMoves] = useState(5);

    // Function to load the user's equipped AI
    const loadProfile = async () => {
        setLoading(true);
        const result = await getUserAiProfile();
        if (result.success) {
            setEquippedAI(result.data.equipped_ai); // Assuming API returns { equipped_ai: {...} }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProfile();

        // Listen for an event that the AIDrawer will fire when a config is saved
        const handleConfigChange = () => {
            console.log("AI config changed, reloading profile...");
            loadProfile();
        };
        window.addEventListener('ai-config-changed', handleConfigChange);
        return () => window.removeEventListener('ai-config-changed', handleConfigChange);
    }, []);

    if (loading) return <p>Loading AI...</p>;

    return (
        <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/40 rounded-2xl shadow-lg p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-200 mb-4">AI Agent</h3>
            
            {equippedAI ? (
                <div className="flex-1 flex flex-col">
                    <strong className="text-xl font-semibold text-purple-400">{equippedAI.name}</strong>
                    <p className="text-sm text-gray-400 mt-2 flex-1">{equippedAI.description}</p>
                    
                    <div className="mt-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <label htmlFor="num-moves" className="text-sm text-gray-300">Moves:</label>
                            <input 
                                id="num-moves"
                                type="number"
                                value={numMoves}
                                onChange={(e) => setNumMoves(parseInt(e.target.value, 10))}
                                className="w-20 p-2 bg-slate-900/50 border border-slate-600 rounded-lg text-center text-white"
                                min="1" max="50"
                            />
                        </div>
                        <button
                            onClick={() => onStartAI({ num_moves: numMoves })}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                        >
                            Get AI Moves
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-400">No AI equipped.</p>
            )}

            <button 
                onClick={onOpenDrawer}
                className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg font-medium transition"
            >
                Configure AI
            </button>
        </div>
    );
}