# Tropes Manager

A fast, private, and user-friendly local web application for managing writing tropes. Built with Flask, SQLite, and vanilla JavaScript.

## Features

- 🔍 **Powerful Search**: Real-time search across tropes and categories
- 📝 **CRUD Operations**: Create, read, update, and delete tropes
- 🎯 **Category Management**: Organized by genre categories
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Local Storage**: All data stays on your machine
- ⚡ **Fast Performance**: Optimized for quick searches and navigation

## Project Structure

```
Lab-8a/
├── README.md                 # Project documentation
├── app.py                    # Main Flask application
├── requirements.txt          # Python dependencies
├── data/                     # Data files
│   └── genre_tropes_data.csv # Original CSV data
├── db/                       # Database files
│   └── genre_tropes.db       # SQLite database
├── scripts/                  # Utility scripts
│   ├── csv_to_sqlite.py      # Database import script
│   └── start_server.sh       # Server startup script
├── static/                   # Frontend assets
│   ├── app.js                # JavaScript application logic
│   └── style.css             # Styling
├── templates/                # HTML templates
│   └── index.html            # Main web interface
├── tests/                    # Test suite
│   ├── __init__.py           # Python package init
│   ├── test_api.py           # API endpoint tests
│   ├── test_improvements.py  # Feature tests
│   └── run_tests.py          # Test runner
├── mockups/                  # Design mockups
├── archive/                  # Archived files
└── venv/                     # Python virtual environment
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project:**
   ```bash
   cd /Users/carlo/Lab-8a
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate     # On Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database (if needed):**
   ```bash
   python scripts/csv_to_sqlite.py
   ```

5. **Start the server:**
   ```bash
   # Option 1: Using the startup script (recommended)
   ./scripts/start_server.sh
   
   # Option 2: Using development helper
   python dev.py start
   
   # Option 3: Using Makefile
   make start
   
   # Option 4: Direct Python command
   python app.py
   ```

6. **Access the application:**
   Open your web browser and go to `http://localhost:8000`

## Usage

### Navigation
- **All Tropes**: View all tropes in the database
- **Categories**: Browse tropes by category
- **Search**: Real-time search functionality

### Search Features
- Search across trope names and descriptions
- Filter by specific categories
- Case-insensitive matching
- Instant results as you type

### Managing Tropes
- Add new tropes with descriptions and category assignments
- Edit existing tropes inline
- Delete tropes with confirmation
- Categories are displayed in Title Case format

## Database

The application uses SQLite with the following schema:

- **tropes**: Main table with trope information
- **categories**: Genre categories
- **trope_categories**: Many-to-many relationship table

Current data includes **148 tropes** across **23 categories**.

## Development

### Running Tests
```bash
# Run all tests
python tests/run_tests.py

# Or run specific test files
python -m pytest tests/test_api.py
python -m pytest tests/test_improvements.py
```

### Project Phases
- ✅ **Phase 1**: Backend API development
- ✅ **Phase 2**: Web frontend implementation  
- ✅ **Phase 2.5**: Enhanced UX features
- ✅ **Phase 3**: Project organization and testing

### Development Environment
The project uses:
- Flask 2.3.3 for the web framework
- Flask-CORS for cross-origin requests
- SQLite for data storage
- Vanilla JavaScript for frontend interactivity
- Responsive CSS Grid for layout

## API Endpoints

- `GET /api/tropes` - Get all tropes
- `GET /api/categories` - Get all categories
- `GET /api/search?q=<query>&category=<category>` - Search tropes
- `POST /api/tropes` - Create new trope
- `PUT /api/tropes/<id>` - Update trope
- `DELETE /api/tropes/<id>` - Delete trope

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and release notes.

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Test thoroughly before committing

## Mission

From the project mission statement: *"Build a fast, private, and user-friendly local web application for managing personal writing tropes database, with a clean web interface for CRUD operations and powerful searching capabilities."*

## Technical Notes

- Categories display with underscores replaced by spaces and Title Case formatting
- Search is optimized with both client-side and server-side filtering
- All operations are local - no external API calls
- Responsive design works on various screen sizes
- Git repository included for version control

---

Last updated: January 2025