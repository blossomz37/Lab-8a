VENV := .venv
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.PHONY: setup test clean

setup:
	python -m venv $(VENV)
	$(PIP) install --upgrade pip setuptools wheel
	$(PIP) install -r requirements.txt

test:
	$(PY) -m pytest -q

clean:
	rm -rf $(VENV)
# Makefile for Tropes Manager
# Provides convenient commands for development tasks

.PHONY: help setup start test clean deps status changelog install build

# Default target
help:
	@echo "Tropes Manager Development Commands:"
	@echo ""
	@echo "  make setup     - Set up virtual environment and install dependencies"
	@echo "  make start     - Start the development server"
	@echo "  make test      - Run the test suite"
	@echo "  make clean     - Clean generated files and caches"
	@echo "  make deps      - Check dependencies"
	@echo "  make status    - Show project status"
	@echo "  make changelog - View project changelog"
	@echo "  make install   - Install the package in development mode"
	@echo "  make build     - Build distribution packages"
	@echo ""
	@echo "For more options, use: python dev.py --help"

# Set up development environment
setup:
	@echo "Setting up development environment..."
	python3 -m venv venv
	@echo "Activating virtual environment and installing dependencies..."
	venv/bin/pip install --upgrade pip
	venv/bin/pip install -r requirements.txt
	@echo "Setting up database..."
	venv/bin/python scripts/csv_to_sqlite.py
	@echo "✅ Setup complete! Run 'make start' to start the server"

# Start development server
start:
	@python dev.py start

# Run tests
test:
	@python dev.py test

# Clean project
clean:
	@python dev.py clean
	@rm -rf build/ dist/ *.egg-info/

# Check dependencies
deps:
	@python dev.py check-deps

# Show status
status:
	@python dev.py status

# View changelog
changelog:
	@python dev.py changelog

# Install in development mode
install:
	@echo "Installing package in development mode..."
	pip install -e .
	@echo "✅ Package installed in development mode"

# Build distribution packages
build:
	@echo "Building distribution packages..."
	python -m build
	@echo "✅ Distribution packages built in dist/"

# Quick start for new users
quickstart: setup start

# Development server with auto-reload
dev:
	@echo "Starting development server with auto-reload..."
	@FLASK_ENV=development FLASK_DEBUG=1 python app.py

# Run tests with coverage
test-cov:
	@echo "Running tests with coverage..."
	@python -m pytest tests/ --cov=. --cov-report=html --cov-report=term

# Format code (if black is installed)
format:
	@if command -v black > /dev/null; then \
		echo "Formatting code with black..."; \
		black *.py scripts/ tests/; \
		echo "✅ Code formatted"; \
	else \
		echo "Black not installed. Install with: pip install black"; \
	fi

# Lint code (if flake8 is installed)
lint:
	@if command -v flake8 > /dev/null; then \
		echo "Linting code with flake8..."; \
		flake8 *.py scripts/ tests/; \
		echo "✅ Code linted"; \
	else \
		echo "Flake8 not installed. Install with: pip install flake8"; \
	fi

# Full quality check
quality: format lint test

# Show detailed project info
info:
	@echo "=== Tropes Manager Project Info ==="
	@echo "Python version: $(shell python --version)"
	@echo "Pip version: $(shell pip --version)"
	@echo "Project structure:"
	@tree -I 'venv|__pycache__|*.pyc|.git' -L 2 || ls -la