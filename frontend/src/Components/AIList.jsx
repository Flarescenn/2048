import { useEffect, useState } from "react";
// 🎯 CRITICAL FIX: Ensure the function name is correct
import { fetchAIModels, purchaseAI } from "../api/api"; 

export default function AIList({ onStartAI }) {
    const [aiModels, setAiModels] = useState([]);
    // Use a specific status for an ongoing unlock/purchase, separate from general list loading
    const [isProcessing, setIsProcessing] = useState(false); 
    const [listLoading, setListLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState(null);

    const [numMoves, setNumMoves] = useState(5);

    // --- Data Fetching Effect ---
    const loadAIModels = async () => {
        setListLoading(true);
        setStatusMessage(null);
        
        const result = await fetchAIModels();
        
        if (result.success) {
            setAiModels(result.data);
        } else {
            setStatusMessage({ type: 'error', message: result.error || 'Failed to load AI models.' });
        }
        setListLoading(false);
    };

    useEffect(() => {
        loadAIModels();
    }, []);

    // --- Purchase Handler ---
    const handleUnlock = async (id) => {
        setIsProcessing(true); // Indicate a transaction is pending
        setStatusMessage(null);
        
        const result = await purchaseAI(id);

        if (result.success) {
            // Display success message and reload the list to show the model as unlocked
            setStatusMessage({ type: 'success', message: result.data.success || 'AI unlocked successfully!' });
            // Reload to get updated unlocked status and user points (if points are in user context)
            await loadAIModels(); 
        } else {
            // Display the specific error (e.g., "Not enough points")
            setStatusMessage({ type: 'error', message: result.error || 'Unlock failed.' });
        }
        setIsProcessing(false);
    };

    // --- Rendering Logic ---

    const StatusDisplay = () => {
        if (!statusMessage) return null;
        const base = "mt-3 p-3 rounded text-sm font-medium shadow-sm";
        const style = statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
        
        return <p className={`${base} ${style}`}>{statusMessage.message}</p>;
    };
    
    // Determine the overall busy state
    const isBusy = listLoading || isProcessing;

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border-t-4 border-purple-500 min-h-full">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
               AI Competitors
            </h3>
            
            {/* Display general loading state while fetching list */}
            {listLoading && (
                <p className="text-gray-500 flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading AI list...
                </p>
            )}

            <StatusDisplay />

            <ul className="mt-4 space-y-4">
                {aiModels.map((ai) => (
                    <li key={ai.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <strong className="text-lg font-semibold text-purple-700">{ai.name}</strong> 
                            <span className="text-sm px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                                Tier {ai.tier}
                            </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">{ai.description}</div>
                        
                        <div className="flex justify-end space-x-2">
                            <div className="flex-grow">
                                <label htmlFor={`moves-${ai.id}`} className="text-xs text-gray-500">Moves:</label>
                                <input 
                                    id={`moves-${ai.id}`}
                                    type="number"
                                    value={numMoves}
                                    onChange={(e) => setNumMoves(parseInt(e.target.value, 10))}
                                    className="w-16 p-1 border rounded text-center"
                                    min="1"
                                    max="25" 
                                    disabled={!ai.unlocked || isBusy}
                                />
                            </div>

                            {/* Play Button */}
                            <button 
                                onClick={() => onStartAI({ agent: ai.name, num_moves: numMoves })}
                                disabled={!ai.unlocked || isBusy} 
                                className={`px-4 py-2 rounded-lg font-semibold transition duration-300 shadow-md 
                                    ${ai.unlocked ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            >
                                Get Moves
                            </button>
                            
                            {/* Unlock Button */}
                            {!ai.unlocked && (
                                <button 
                                    onClick={() => handleUnlock(ai.id)}
                                    disabled={isBusy} 
                                    className="px-4 py-2 rounded-lg font-semibold transition duration-300 shadow-md bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                                >
                                    {isProcessing ? 'Processing...' : `Unlock for ${ai.cost} pts`}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            
            <button 
                onClick={loadAIModels} 
                disabled={isBusy}
                className="mt-6 w-full p-2 border border-gray-300 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition duration-200"
            >
                {isBusy ? 'Loading/Refreshing...' : 'Refresh AI List'}
            </button>
        </div>
    );
}