import { useState } from 'react';
import { purchaseAI, saveUserAiProfile } from "../api/api";
// We'll create this sleek slider next
import Slider from './Slider';

export default function AIProfileView({ ai, userProfile, onBack, onPurchaseSuccess, onSetConfig }) {
    const isUnlocked = userProfile.unlocked?.includes(ai.id);
    const isEquipped = userProfile.equipped_ai?.id === ai.id;

    // Initialize parameters from user's saved config, or the AI's defaults
    const [params, setParams] = useState(userProfile.configs?.[ai.id] || 
        // Create defaults from the tunable_params definition
        Object.fromEntries(Object.entries(ai.tunable_params).map(([key, val]) => [key, val.default]))
    );
    const [isProcessing, setIsProcessing] = useState(false);

    const handleParamChange = (paramName, value) => {
        setParams(prev => ({ ...prev, [paramName]: value }));
    };

    const handlePurchase = async () => {
        setIsProcessing(true);
        const result = await purchaseAI(ai.id);
        if (result.success) {
            onPurchaseSuccess(ai.id); // Tell the parent drawer we unlocked it
        } else {
            alert(result.error || "Purchase failed.");
        }
        setIsProcessing(false);
    };

    const handleEquip = async () => {
        setIsProcessing(true);
        const result = await saveUserAiProfile(ai.id, params);
        if (result.success) {
            // Dispatch event to tell EquippedAI to refresh, then call the close function
            window.dispatchEvent(new Event('ai-config-changed'));
            onSetConfig();
        } else {
            alert("Failed to set configuration.");
        }
        setIsProcessing(false);
    };

    return (
        <div>
            <button onClick={onBack} className="text-sm text-blue-400 mb-6">&larr; Back to List</button>
            
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white">{ai.name}</h2>
                <p className="text-purple-400">{ai.agent_class}</p>
            </div>
            
            <p className="text-gray-300 text-center mb-8">{ai.description}</p>
            
            {/* Base Stats section */}
            <div className="bg-slate-800 p-4 rounded-lg mb-8">
                <h4 className="text-lg font-semibold text-white mb-3">Base Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(ai.base_params).map(([key, value]) => (
                        <div key={key} className="bg-slate-700 p-2 rounded text-center">
                            <p className="text-xs uppercase text-gray-400">{key}</p>
                            <p className="text-lg font-bold text-white">{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tunable Parameters section */}
            {isUnlocked && Object.keys(ai.tunable_params).length > 0 && (
                <div className="bg-slate-800 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4">Tunable Parameters</h4>
                    <div className="space-y-6"> {/* Increased spacing for the new slider */}
                        {Object.entries(ai.tunable_params).map(([key, config]) => (
                            // --- 2. REPLACE THE OLD INPUT WITH YOUR NEW COMPONENT ---
                            <Slider
                                key={key}
                                label={config.label}
                                min={config.min}
                                max={config.max}
                                step={config.step}
                                value={params[key] || config.default}
                                onChange={(val) => handleParamChange(key, val)}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-8">
                {!isUnlocked ? (
                    <button 
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:bg-gray-500"
                    >
                        {isProcessing ? "Processing..." : `Unlock for ${ai.cost} pts`}
                    </button>
                ) : (
                    <button
                        onClick={handleEquip}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-lg font-bold transition ${isEquipped ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {isProcessing ? "Saving..." : isEquipped ? "Currently Equipped" : "Equip & Save Config"}
                    </button>
                )}
            </div>
        </div>
    );
}