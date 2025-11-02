import { useState } from 'react';
import { purchaseAI, saveUserAiProfile } from "../api/api";
// We'll create this sleek slider next
import Slider from './Slider';
import Tooltip from './Tooltip';

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
            {Object.keys(ai.base_params).length > 0 && (
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
            )}

            {/* Tunable Parameters section */}
            {isUnlocked && Object.keys(ai.tunable_params).length > 0 && (
                <div className="bg-slate-800 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4">Tunable Parameters</h4>
                    <div className="space-y-6"> {/* Increased spacing for the new slider */}
                        {Object.entries(ai.tunable_params).map(([key, config]) => (
                            <div key={key}>
                                {/* --- 2. WRAP THE LABEL AND TOOLTIP --- */}
                                <div className="group flex items-center mb-1"> {/* <-- Added 'group' here */}
                                    <label className="text-sm font-medium text-gray-300">{config.label}</label>
                                    <Tooltip text={config.description} />
                                </div>
                                <Slider
                                    min={config.min}
                                    max={config.max}
                                    step={config.step}
                                    value={params[key] || config.default}
                                    onChange={(val) => handleParamChange(key, val)}
                                />
                            </div>
                           
                        ))}
                    </div>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-8">
                {!isUnlocked ? (
        // --- THIS IS THE NEW BUTTON ---
                <button 
                    onClick={handlePurchase}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-lg font-bold transition-all duration-300
                            bg-green-500/20 hover:bg-green-500/30      /* Semi-transparent green background */
                            text-green-300 hover:text-green-200       /* Glowing text color */
                            border border-green-500/30                  /* Faint border to define the shape */
                            backdrop-blur-sm                              
                            shadow-lg shadow-green-500/10               /* A subtle green glow */
                            transform hover:scale-100                 /* Interactive grow effect */
                            disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed" // Disabled state
                >
                    {isProcessing ? "Processing..." : `Unlock for ${ai.cost} pts`}
                </button>
            ) : (
                // The "Equip & Save Config" button can remain as is, or you can apply a similar
                // blue crystalline style to it if you wish.
                <button
                    onClick={handleEquip}
                    disabled={isProcessing || isEquipped} // Also disable if already equipped
                    className={`w-full py-3 rounded-lg font-bold transition-all duration-300
                            backdrop-blur-sm border
                            ${isEquipped 
                                ? 'bg-slate-700/80 text-slate-400 border-slate-600 cursor-not-allowed'
                                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-blue-200 border-blue-500/40 shadow-lg shadow-blue-500/10'
                            }`}
                >
                    {isProcessing ? "Saving..." : isEquipped ? "Currently Equipped" : "Equip & Save Config"}
                </button>
            )}
            </div>
        </div>
    );
}