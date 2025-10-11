import requests

def check_server():
    try:
        # Try to get the CSRF token
        response = requests.get('http://127.0.0.1:8000/api/csrf/', timeout=5)
        print(f"Status code: {response.status_code}")
        print(f"Response text: {response.text}")
        print(f"Headers: {response.headers}")
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to server: {e}")

if __name__ == "__main__":
    check_server()