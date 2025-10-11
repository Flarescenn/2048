import { useEffect, useState } from "react";
import { fetchAIModels, purchaseAI } from "../api/api"; // Corrected import name

export default function AIList({ onStartAI }) {
    const [aiModels, setAiModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- Data Fetching Effect ---
    const loadAIModels = async () => {
        setLoading(true);
        setStatusMessage(null);
        
        const result = await fetchAIModels();
        
        if (result.success) {
            // Assuming result.data is an array of AI models
            setAiModels(result.data);
            setStatusMessage(null);
        } else {
            // Display error from the API call
            setStatusMessage({ type: 'error', message: result.error || 'Failed to load AI models.' });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAIModels();
    }, []);

    // --- Purchase Handler ---
    const handleUnlock = async (id) => {
        setLoading(true);
        setStatusMessage(null);
        
        const result = await purchaseAI(id);

        if (result.success) {
            // Display success message and reload the list to show the model as unlocked
            setStatusMessage({ type: 'success', message: result.data.success || 'AI unlocked successfully!' });
            await loadAIModels(); 
        } else {
            // Display the specific error (e.g., "Not enough points")
            setStatusMessage({ type: 'error', message: result.error || 'Unlock failed.' });
        }
        setLoading(false);
    };

    // --- Rendering Logic ---

    const StatusDisplay = () => {
        if (!statusMessage) return null;
        const style = { 
            color: statusMessage.type === 'error' ? 'red' : 'green',
            fontWeight: 'bold',
            marginTop: '10px'
        };
        return <p style={style}>{statusMessage.message}</p>;
    };

    return (
        <div>
            <h3>AI Models</h3>
            {/* Display general loading state while fetching list */}
            {loading && !aiModels.length && <p>Loading AI list...</p>}
            
            <StatusDisplay />

            <ul>
                {aiModels.map((ai) => (
                    <li key={ai.id} className="mb-4 p-2 border rounded">
                        <strong>{ai.name}</strong> (Tier {ai.tier}, Cost: {ai.cost} points)
                        <div>{ai.description}</div>
                        
                        <div className="mt-2 space-x-2">
                            {/* The 'unlocked' flag MUST come from your backend serializer/model */}
                            <button 
                                onClick={() => onStartAI(ai.name)}
                                disabled={!ai.unlocked || loading} // Disable if not unlocked or busy
                                className={`p-1 rounded ${ai.unlocked ? 'bg-blue-500 text-white' : 'bg-gray-400'}`}
                            >
                                {ai.unlocked ? `Play ${ai.name}` : 'Locked'}
                            </button>
                            
                            {/* Conditionally render the Unlock button */}
                            {!ai.unlocked && (
                                <button 
                                    onClick={() => handleUnlock(ai.id)}
                                    disabled={loading} // Disable if any transaction is pending
                                    className="p-1 rounded bg-green-500 text-white"
                                >
                                    {loading ? 'Processing...' : `Unlock for ${ai.cost} pts`}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            
            {/* Optional: Add a button to manually refresh the list */}
            <button 
                onClick={loadAIModels} 
                disabled={loading}
                className="mt-4 p-2 bg-yellow-500 text-white rounded"
            >
                {loading ? 'Refreshing...' : 'Refresh List'}
            </button>
        </div>
    );
}