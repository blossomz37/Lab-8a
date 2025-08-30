#!/bin/bash

# Script to start the Flask development server
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(dirname "$(dirname "$0")")"
cd "$PROJECT_ROOT"

# Activate virtual environment
source venv/bin/activate

# Start Flask app
echo "Starting Flask development server..."
echo "Access the API at: http://localhost:8000"
echo "Press Ctrl+C to stop"

python app.py
