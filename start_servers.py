# Use this script to start both the backend and frontend servers
# Run with: python start_servers.py

import subprocess
import sys
import os
import time
import webbrowser
from threading import Thread
import psutil
# Project paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Server URLs
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"

def run_backend():
    print("\n" + "="*50)
    print("Starting Django backend with Daphne (WebSocket support)")
    print("="*50)
    
    # Change to backend directory
    os.chdir(BACKEND_DIR)
    
    # Run the server using Daphne
    backend_cmd = [sys.executable, "-m", "daphne", "core.asgi:application", "-b", "127.0.0.1", "-p", "8000"]
    
    # Start server and redirect output
    backend_process = subprocess.Popen(
        backend_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Print server output in realtime
    print(f"\nBackend server starting at {BACKEND_URL}\n")
    print("Log output:")
    print("-" * 40)
    
    try:
        for line in backend_process.stdout:
            print(f"[Backend] {line.strip()}")
    except KeyboardInterrupt:
        backend_process.terminate()
        print("\nBackend server stopped")
        
# --- NEW: Function to kill processes using a specific port ---
def kill_process_on_port(port):
    """Finds and terminates any process listening on the given port."""
    print(f"\nChecking for processes on port {port}...")
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
            try:
                proc = psutil.Process(conn.pid)
                print(f"  > Found process '{proc.name()}' (PID: {proc.pid}) using port {port}.")
                print(f"  > Terminating process...")
                proc.kill()
                proc.wait(timeout=3) # Wait for the process to terminate
                print(f"  > Process terminated successfully.")
            except psutil.NoSuchProcess:
                print(f"  > Process on port {port} already terminated.")
            except psutil.AccessDenied:
                print(f"  > ERROR: Access denied to terminate process on port {port}. Try running as administrator/sudo.")
            except psutil.TimeoutExpired:
                print(f"  > WARNING: Process on port {port} did not terminate in time.")
            return # Assume only one process per port
    print(f"  > Port {port} is clear.")

def run_frontend():
    print("\n" + "="*50)
    print("Starting Vite frontend development server")
    print("="*50)
    
    # Give the backend a moment to start
    time.sleep(2)
    
    # Change to frontend directory
    os.chdir(FRONTEND_DIR)
    
    # Check if npm is available
    try:
        subprocess.run(["npm", "--version"], check=True, stdout=subprocess.PIPE)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: npm not found. Please install Node.js and npm.")
        return
    
    # Start the frontend server
    frontend_cmd = ["npm", "run", "dev"]
    
    # Start server and redirect output
    frontend_process = subprocess.Popen(
        frontend_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Print server output in realtime
    print(f"\nFrontend server starting at {FRONTEND_URL}\n")
    print("Log output:")
    print("-" * 40)
    
    # Wait a bit for the server to start before opening browser
    time.sleep(3)
    
    # Open browser
    try:
        webbrowser.open(FRONTEND_URL)
        print(f"Opened {FRONTEND_URL} in browser")
    except:
        print(f"Please open {FRONTEND_URL} in your browser")
    
    try:
        for line in frontend_process.stdout:
            print(f"[Frontend] {line.strip()}")
    except KeyboardInterrupt:
        frontend_process.terminate()
        print("\nFrontend server stopped")

if __name__ == "__main__":
    print("\n" + "*"*60)
    print(" 2048 Game Development Server")
    print("*"*60)
    print("\nStarting both backend and frontend servers...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("Warning: Python 3.8+ recommended for full compatibility")
    
    # Start the backend server in a separate thread
    backend_thread = Thread(target=run_backend)
    backend_thread.daemon = True
    backend_thread.start()
    
    # Run the frontend server in the main thread
    # This allows for clean shutdown of both servers with Ctrl+C
    run_frontend()