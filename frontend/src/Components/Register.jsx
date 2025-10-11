// In frontend/src/Components/Register.jsx

import { useState, useEffect } from "react";
import { registerUser } from "../api/api";
import { setupCSRF } from "../api/csrf";

// CRITICAL FIX: Define the key used by App.jsx to clear local storage.
const GAME_STATE_STORAGE_KEY = 'gameBoardState'; 

export default function Register({ onSuccess }){
    // Ensure CSRF token is set up before form submission
    useEffect(() => {
        // Make sure CSRF token is set up
        const ensureCSRF = async () => {
            try {
                const result = await setupCSRF();
                console.log('CSRF setup completed:', result);
            } catch (error) {
                console.error('CSRF setup failed:', error);
            }
        };
        
        ensureCSRF();
    }, []);
    
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!username || !password) return alert("Enter username and password");
        
        try {
            // Ensure CSRF is set up right before the request
            await setupCSRF();
            
            setLoading(true);
            const res = await registerUser(username, password);
            setLoading(false);
            
            if(res.success){
                console.log("Registration successful!");
                // This line is now defined and won't throw the error:
                localStorage.removeItem(GAME_STATE_STORAGE_KEY);
                
                if(onSuccess) onSuccess();
            } else {
                alert(res.error || "Registration failed");
            }
        } catch (error) {
            setLoading(false);
            console.error('Registration error:', error);
            alert('Registration failed. See console for details.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 max-w-sm">
            <h2 className="text-xl font-bold">Create Account</h2>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="p-2 border rounded" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" className="p-2 border rounded" />
            <button type="submit" disabled={loading} className="bg-green-600 text-white p-2 rounded">{loading ? "Creating..." : "Create Account"}</button>
        </form>
    );
}