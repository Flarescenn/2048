// In frontend/src/Components/Login.jsx

import { useState } from 'react'
import { loginUser } from '../api/api'

// CRITICAL FIX: Define the key used by App.jsx to clear local storage.
const GAME_STATE_STORAGE_KEY = 'gameBoardState'; 

export default function Login({ onSuccess }){
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) =>{
        e.preventDefault();
        if(!username || !password) return alert('Enter username and password')
        setLoading(true)
        const res = await loginUser(username, password)
        setLoading(false)
        if(res.success){
            // This line is now defined and won't throw the error:
            localStorage.removeItem(GAME_STATE_STORAGE_KEY); 
            
            if(onSuccess) onSuccess();
        } else {
            alert(res.error || 'Login failed')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 max-w-sm">
            <h2 className="text-xl font-bold">Login</h2>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="p-2 border rounded" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" className="p-2 border rounded" />
            <button type="submit" disabled={loading} className="bg-blue-600 text-white p-2 rounded">{loading ? 'Logging in...' : 'Login'}</button>
        </form>
    )
}