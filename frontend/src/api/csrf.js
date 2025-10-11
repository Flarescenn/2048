import axios from 'axios';

// For development with Vite proxy
const isDevelopment = import.meta.env.DEV;
// Use relative URL for development (proxied by Vite)
// or absolute URL for production
const API_BASE = isDevelopment ? '/api' : import.meta.env.VITE_API_BASE;

// Helper function to extract cookies
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

// Function to get the CSRF token and set it globally for Axios
export const setupCSRF = async () => {
    try {
        console.log('Setting up CSRF protection with API base:', API_BASE);
        console.log('Current cookies before setup:', document.cookie);
        
        // Configure axios to include credentials
        axios.defaults.withCredentials = true;
        
        // 1. Make a GET request to a Django endpoint that sets the CSRF cookie
        const csrfResponse = await axios.get(`${API_BASE}/csrf/`, { 
            withCredentials: true,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('CSRF cookie request completed:', csrfResponse.status);
        console.log('Response headers:', csrfResponse.headers);
        
        // Wait a moment for cookies to be properly set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 2. Get the CSRF token from the cookie
        const csrfToken = getCookie('csrftoken');
        console.log('CSRF token retrieved:', csrfToken ? 'Found' : 'Not found');
        console.log('Current cookies after setup:', document.cookie);
        
        if (csrfToken) {
            // 3. Configure axios to include the CSRF token in headers for all requests
            axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
            console.log('CSRF token set in axios defaults');
            
            // Also set up an interceptor to refresh the token before each request
            axios.interceptors.request.use(config => {
                // Make sure we're always getting the latest token
                const currentToken = getCookie('csrftoken');
                if (currentToken) {
                    config.headers['X-CSRFToken'] = currentToken;
                    console.log(`Request to ${config.url}: Setting X-CSRFToken header`);
                } else {
                    console.warn(`Request to ${config.url}: No CSRF token found`);
                }
                return config;
            }, error => Promise.reject(error));
        }
        
        return { success: !!csrfToken, token: csrfToken };

    } catch (error) {
        console.error('Error setting up CSRF token:', error);
        // If the csrf/ endpoint is missing or returns 404, this will fail.
        return { success: false, error: error };
    }
};

export default setupCSRF;