#!/usr/bin/env python3
"""
Development helper script for Tropes Manager
Provides common development tasks and utilities
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent
DB_PATH = PROJECT_ROOT / "db" / "genre_tropes.db"
DATA_PATH = PROJECT_ROOT / "data" / "genre_tropes_data.csv"

def run_command(cmd, cwd=None):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_ROOT, 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Command failed: {cmd}")
            print(f"Error: {result.stderr}")
            return False
        return True
    except Exception as e:
        print(f"Error running command: {cmd}")
        print(f"Exception: {e}")
        return False

def setup_database():
    """Initialize the database from CSV data."""
    print("Setting up database...")
    
    if not DATA_PATH.exists():
        print(f"Error: CSV data file not found at {DATA_PATH}")
        return False
    
    # Run the CSV import script
    import_script = PROJECT_ROOT / "scripts" / "csv_to_sqlite.py"
    if not import_script.exists():
        print(f"Error: Import script not found at {import_script}")
        return False
    
    print("Importing CSV data to SQLite...")
    success = run_command(f"python {import_script}")
    
    if success and DB_PATH.exists():
        print(f"✅ Database successfully created at {DB_PATH}")
        return True
    else:
        print("❌ Database setup failed")
        return False

def run_tests():
    """Run the test suite."""
    print("Running tests...")
    
    test_runner = PROJECT_ROOT / "tests" / "run_tests.py"
    if test_runner.exists():
        success = run_command(f"python {test_runner}")
        if success:
            print("✅ All tests completed")
        else:
            print("❌ Some tests failed")
        return success
    else:
        print("Running tests with pytest...")
        return run_command("python -m pytest tests/ -v")

def start_server(port=8000):
    """Start the development server."""
    print(f"Starting development server on port {port}...")
    
    if not DB_PATH.exists():
        print("Database not found. Setting up database first...")
        if not setup_database():
            print("Cannot start server without database")
            return False
    
    print(f"Server will be available at http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    
    # Use the main app directly
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_PORT'] = str(port)
    sys.path.insert(0, str(PROJECT_ROOT))
    
    try:
        from app import main
        main()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"Error starting server: {e}")
        return False
    
    return True

def check_dependencies():
    """Check if all required dependencies are installed."""
    print("Checking dependencies...")
    
    requirements_file = PROJECT_ROOT / "requirements.txt"
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    # Try to import key dependencies
    try:
        import flask
        import flask_cors
        print("✅ Flask and Flask-CORS are installed")
        
        # Check Flask version
        flask_version = flask.__version__
        print(f"   Flask version: {flask_version}")
        
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def clean_project():
    """Clean up generated files and caches."""
    print("Cleaning project...")
    
    patterns_to_clean = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo", 
        "build/",
        "dist/",
        "*.egg-info/",
        ".pytest_cache/",
        ".coverage"
    ]
    
    for pattern in patterns_to_clean:
        run_command(f"find . -name '{pattern}' -exec rm -rf {{}} + 2>/dev/null || true")
    
    print("✅ Project cleaned")

def show_status():
    """Show project status and information."""
    print("=== Tropes Manager Status ===")
    
    # Check database
    if DB_PATH.exists():
        size_mb = DB_PATH.stat().st_size / (1024 * 1024)
        print(f"✅ Database: {DB_PATH} ({size_mb:.1f} MB)")
    else:
        print(f"❌ Database: Not found at {DB_PATH}")
    
    # Check CSV data
    if DATA_PATH.exists():
        size_kb = DATA_PATH.stat().st_size / 1024
        print(f"✅ CSV Data: {DATA_PATH} ({size_kb:.1f} KB)")
    else:
        print(f"❌ CSV Data: Not found at {DATA_PATH}")
    
    # Check dependencies
    check_dependencies()
    
    # Show project structure
    print(f"\n📁 Project root: {PROJECT_ROOT}")
    print(f"📂 Key directories:")
    for dir_name in ["static", "templates", "tests", "scripts", "db", "data"]:
        dir_path = PROJECT_ROOT / dir_name
        if dir_path.exists():
            print(f"   ✅ {dir_name}/")
        else:
            print(f"   ❌ {dir_name}/")

def view_changelog():
    """Display the project changelog."""
    changelog_path = PROJECT_ROOT / "CHANGELOG.md"
    if changelog_path.exists():
        print("📋 Tropes Manager - Changelog")
        print("=" * 50)
        with open(changelog_path, 'r') as f:
            # Show first 50 lines to avoid overwhelming output
            lines = f.readlines()[:50]
            print(''.join(lines))
        if len(lines) >= 50:
            print("\n... (showing first 50 lines)")
            print(f"View full changelog: cat {changelog_path}")
    else:
        print("❌ CHANGELOG.md not found")

def main():
    """Main development script entry point."""
    parser = argparse.ArgumentParser(description="Tropes Manager Development Helper")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Database setup
    subparsers.add_parser('setup-db', help='Initialize database from CSV')
    
    # Server start
    server_parser = subparsers.add_parser('start', help='Start development server')
    server_parser.add_argument('--port', type=int, default=8000, help='Port number')
    
    # Test running
    subparsers.add_parser('test', help='Run test suite')
    
    # Dependency check
    subparsers.add_parser('check-deps', help='Check dependencies')
    
    # Clean project
    subparsers.add_parser('clean', help='Clean generated files')
    
    # Show status
    subparsers.add_parser('status', help='Show project status')
    
    # View changelog
    subparsers.add_parser('changelog', help='View project changelog')
    
    args = parser.parse_args()
    
    if args.command == 'setup-db':
        setup_database()
    elif args.command == 'start':
        start_server(args.port)
    elif args.command == 'test':
        run_tests()
    elif args.command == 'check-deps':
        check_dependencies()
    elif args.command == 'clean':
        clean_project()
    elif args.command == 'status':
        show_status()
    elif args.command == 'changelog':
        view_changelog()
    else:
        parser.print_help()

if __name__ == '__main__':
    main()