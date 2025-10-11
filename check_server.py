import socket
import sys

def check_port(host, port):
    """Check if a port is open on the host."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)  # 2 second timeout
    result = sock.connect_ex((host, port))
    sock.close()
    return result == 0

if __name__ == "__main__":
    port = 8000
    hosts = ["localhost", "127.0.0.1"]
    
    for host in hosts:
        is_open = check_port(host, port)
        print(f"Port {port} on {host} is {'open' if is_open else 'closed'}")