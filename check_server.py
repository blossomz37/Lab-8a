#!/usr/bin/env python3
"""
Server status checker and port utility
"""

import socket
import subprocess
import sys
import requests
import time

def check_port_usage(port):
    """Check what's using a specific port"""
    try:
        # Try lsof command
        result = subprocess.run(['lsof', '-i', f':{port}'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            print(f"🔍 Port {port} is being used by:")
            print(result.stdout)
            return True
        else:
            print(f"✅ Port {port} appears to be free")
            return False
    except FileNotFoundError:
        # Fallback method using socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result == 0:
            print(f"❌ Port {port} is in use (socket test)")
            return True
        else:
            print(f"✅ Port {port} is free (socket test)")
            return False

def find_free_port(start_port=8000, max_tries=10):
    """Find a free port starting from start_port"""
    for port in range(start_port, start_port + max_tries):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result != 0:  # Port is free
            return port
    return None

def check_server_status(port=8000):
    """Check if our Flask server is responding"""
    try:
        response = requests.get(f'http://localhost:{port}/api/', timeout=2)
        if response.status_code == 200:
            data = response.json()
            if 'message' in data and 'tropes' in data['message']:
                print(f"✅ Our Flask server is running on port {port}")
                return True
        print(f"❌ Something else is running on port {port}")
        return False
    except requests.exceptions.RequestException:
        print(f"❌ No server responding on port {port}")
        return False

def main():
    print("🔧 Server Status Checker")
    print("=" * 40)
    
    # Check common ports
    for port in [8000, 8001, 8002, 5000]:
        print(f"\nChecking port {port}:")
        if check_port_usage(port):
            if check_server_status(port):
                print(f"   👍 This looks like our server!")
            else:
                print(f"   ⚠️  Different application using this port")
        else:
            print(f"   Available for use")
    
    # Suggest next steps
    print(f"\n💡 Suggestions:")
    free_port = find_free_port()
    if free_port:
        print(f"   • Use port {free_port}: python app.py --port {free_port}")
        print(f"   • Or kill processes using port 8000")
        print(f"   • Or modify app.py to auto-select port")

if __name__ == "__main__":
    main()
