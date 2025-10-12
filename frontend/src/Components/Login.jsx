import { useState } from 'react'
import { loginUser, fetchCurrentUser } from '../api/api'

const GAME_STATE_STORAGE_KEY = 'gameBoardState'; 

export default function Login({ onSuccess }){
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if(!username || !password) {
            setError('Please enter both username and password');
            return;
        }
        
        setLoading(true)
        try {
            const res = await loginUser(username, password)
            
            if(res.success){
                localStorage.removeItem(GAME_STATE_STORAGE_KEY); 
                
                const userData = await fetchCurrentUser();
                console.log("Login successful, user data:", userData);
                
                if(onSuccess && userData) {
                    onSuccess(userData);
                } else if(onSuccess) {
                    onSuccess({ username });
                }
            } else {
                setError(res.error || 'Login failed');
            }
        } catch (error) {
            console.error("Login error:", error);
            setError(error.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                    </label>
                    <input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        placeholder="Enter your username" 
                        className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                    </label>
                    <input 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        type="password" 
                        placeholder="Enter your password" 
                        className="w-full p-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            
            <button 
                type="submit" 
                disabled={loading} 
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed"
            >
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    )
}