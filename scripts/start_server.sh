#!/bin/bash

# Script to start the Flask development server
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Start Flask app
echo "Starting Flask development server..."
echo "Access the API at: http://localhost:8000"
echo "Press Ctrl+C to stop"

python app.py
