#!/usr/bin/env python3
"""
Smart development server manager for the Personal Trope Database.
Handles server lifecycle, health checks, and graceful shutdowns.
"""
import subprocess
import time
import requests
import sys
import os
import signal
import json
from pathlib import Path

class DevServer:
    def __init__(self):
        self.process = None
        self.port = 8000
        self.host = "localhost"
        self.base_url = f"http://{self.host}:{self.port}"
        self.pid_file = Path("server.pid")
        
    def is_running(self):
        """Check if server is already running"""
        try:
            response = requests.get(f"{self.base_url}/api", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def get_running_pid(self):
        """Get PID of running server if exists"""
        if self.pid_file.exists():
            try:
                with open(self.pid_file, 'r') as f:
                    return int(f.read().strip())
            except:
                return None
        return None
    
    def kill_existing_server(self):
        """Kill any existing server process"""
        try:
            # Kill by PID file
            pid = self.get_running_pid()
            if pid:
                os.kill(pid, signal.SIGTERM)
                time.sleep(1)
                
            # Kill by port (backup method)
            result = subprocess.run(['lsof', '-ti', f':{self.port}'], 
                                  capture_output=True, text=True)
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                    except:
                        pass
                time.sleep(1)
                        
            # Clean up PID file
            if self.pid_file.exists():
                self.pid_file.unlink()
                
        except Exception as e:
            print(f"Warning: Error cleaning up existing server: {e}")
    
    def start(self, force=False):
        """Start the development server"""
        if self.is_running() and not force:
            print("✅ Server already running and healthy")
            self.health_check()
            return True
            
        if force:
            print("🔄 Force restart requested - killing existing server...")
            self.kill_existing_server()
        
        print("🚀 Starting development server...")
        
        # Start the server
        env = os.environ.copy()
        env['PYTHONPATH'] = str(Path.cwd())
        
        self.process = subprocess.Popen([
            sys.executable, 'app.py'
        ], env=env, cwd=Path.cwd())
        
        # Save PID
        with open(self.pid_file, 'w') as f:
            f.write(str(self.process.pid))
        
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        for i in range(15):  # 15 second timeout
            time.sleep(1)
            if self.is_running():
                print(f"✅ Server started successfully on {self.base_url}")
                self.health_check()
                return True
            print(f"   Attempt {i+1}/15...")
        
        print("❌ Server failed to start within 15 seconds")
        return False
    
    def stop(self):
        """Stop the development server"""
        if self.process:
            self.process.terminate()
            self.process.wait()
        
        self.kill_existing_server()
        print("🛑 Server stopped")
    
    def health_check(self):
        """Perform comprehensive health check"""
        try:
            response = requests.get(f"{self.base_url}/api", timeout=5)
            data = response.json()
            
            print("📊 Server Health Check:")
            print(f"   API Endpoints: {len(data.get('endpoints', []))}")
            
            db_info = data.get('database_info', {})
            print(f"   Database: {db_info.get('tropes', 0)} tropes, {db_info.get('categories', 0)} categories, {db_info.get('works', 0)} works")
            
            print(f"   Status: ✅ Healthy")
            return True
        except Exception as e:
            print(f"   Status: ❌ Unhealthy - {e}")
            return False
    
    def restart(self):
        """Restart the server"""
        print("🔄 Restarting server...")
        self.stop()
        time.sleep(2)
        return self.start()

def main():
    server = DevServer()
    
    if len(sys.argv) < 2:
        print("Usage: python dev_server.py [start|stop|restart|status|force-start]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        server.start()
    elif command == "force-start":
        server.start(force=True)
    elif command == "stop":
        server.stop()
    elif command == "restart":
        server.restart()
    elif command == "status":
        if server.is_running():
            print("✅ Server is running")
            server.health_check()
        else:
            print("❌ Server is not running")
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
