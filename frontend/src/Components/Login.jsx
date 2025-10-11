import { useState } from 'react'
import { loginUser, fetchCurrentUser } from '../api/api'

const GAME_STATE_STORAGE_KEY = 'gameBoardState'; 

export default function Login({ onSuccess }){
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!username || !password) return alert('Enter username and password')
        
        setLoading(true)
        try {
            const res = await loginUser(username, password)
            
            if(res.success){
                localStorage.removeItem(GAME_STATE_STORAGE_KEY); 
                
                // CRITICAL FIX: Fetch the user data after successful login
                const userData = await fetchCurrentUser();
                console.log("Login successful, user data:", userData);
                
                if(onSuccess && userData) {
                    // Pass the actual user data to the parent
                    onSuccess(userData);
                } else if(onSuccess) {
                    // Fallback: pass username if fetchCurrentUser fails
                    onSuccess({ username });
                }
            } else {
                alert(res.error || 'Login failed')
            }
        } catch (error) {
            console.error("Login error:", error);
            alert('Login failed: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 max-w-sm">
            <h2 className="text-xl font-bold">Login</h2>
            <input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="username" 
                className="p-2 border rounded" 
            />
            <input 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                type="password" 
                placeholder="password" 
                className="p-2 border rounded" 
            />
            <button 
                type="submit" 
                disabled={loading} 
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    )
}