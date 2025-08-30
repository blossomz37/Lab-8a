# Personal Trope Database

[![CI](https://github.com/blossomz37/Lab-8a/actions/workflows/ci.yml/badge.svg)](https://github.com/blossomz37/Lab-8a/actions/workflows/ci.yml)

A fast, private, and user-friendly local web application for managing a personal database of writing tropes. Built with Flask, SQLite, and a clean web interface.

## 🚀 Quick Start

1. **Setup Environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
```

## For students

Quick checklist to get started (recommended: VS Code Dev Container):

- Open the repo in VS Code and use "Dev Containers: Reopen in Container". The container will create a `.venv` and install dependencies and test tools.
- Or locally: `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt`.
- Run tests: `./scripts/run_tests.sh` or `make test`.


2. **Start the Server:**
```bash
source venv/bin/activate
gunicorn --bind 0.0.0.0:8000 app:app --daemon
```

3. **Access the Application:**
- Web Interface: http://localhost:8000
- API Documentation: http://localhost:8000/api

## ✅ Current Features (Phase 4.1 Complete)

- 🔍 **Full-text Search**: Search across 153 tropes and 23 categories
- � **Browse Tropes**: View all tropes with category associations
- �️ **Category Management**: Organized by genre categories
- ➕ **Create Tropes**: Full trope creation with category support via API
- 📱 **Responsive Web Interface**: Clean, functional design
- 🔒 **Local Database**: SQLite with 153 pre-loaded tropes
- ⚡ **Production Ready**: Gunicorn server deployment

## 🛠️ Technical Architecture

**Backend:**
- **Framework**: Flask 2.3.3 with Flask-CORS
- **Server**: Gunicorn 23.0.0 (production deployment)  
- **Database**: SQLite with UUID primary keys
- **API**: RESTful JSON endpoints

**Database:**
- **153 Tropes** with full descriptions and category associations
- **23 Categories** (Romance, Dark Romance, Paranormal, etc.)
- **Many-to-many relationships** between tropes and categories

## 📡 API Endpoints

### Read Operations
- `GET /api/` - API documentation
- `GET /api/tropes` - List all tropes (153 total)
- `GET /api/tropes/<id>` - Individual trope details
- `GET /api/categories` - List all categories (23 total)
- `GET /api/search?q=<query>` - Full-text search

### Write Operations ✅ NEW
- `POST /api/tropes` - Create new trope with categories

**Create Trope Example:**
```bash
curl -X POST http://localhost:8000/api/tropes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Trope Name",
    "description": "Detailed description of the trope and its usage...",
    "categories": ["Paranormal", "Dark Romance"]
  }'
```

## 🗂️ Project Structure

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