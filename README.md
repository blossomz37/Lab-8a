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

## ✅ Current Features (Phase 5.1 Complete - v2.0)

- 🔍 **Advanced Search**: Full-text search across 155 tropes with performance optimization
- 📚 **Complete CRUD**: Tropes, Categories, Works, and Examples with rich relationships
- 🔗 **Smart Navigation**: Clickable categories, relationship indicators, cross-reference modals
- 🎨 **Professional UI**: Winter theme with dark/light mode toggle and status monitoring
- 📊 **Analytics Dashboard**: Real-time statistics and data visualization
- 📤 **Data Export**: One-click CSV export with smart filtering
- ⚡ **High Performance**: Database indexes for optimal query speed
- 📱 **Responsive Design**: WCAG 2.1 AA compliant, mobile-optimized
- 🔒 **Local Database**: SQLite with 155 tropes, 23 categories, 5+ works

## 🛠️ Technical Architecture

**Backend:**
- **Framework**: Flask 2.3.3 with Flask-CORS
- **Server**: Gunicorn 23.0.0 (production deployment)  
- **Database**: SQLite with UUID primary keys
- **API**: RESTful JSON endpoints

**Database:**
- **155 Tropes** with relationship counts and cross-reference navigation
- **23 Categories** with clickable filtering and smart navigation
- **5+ Works** with complete metadata and trope relationships
- **Multiple Examples** linking tropes to works with rich context
- **Performance Optimized** with strategic database indexes

## 📡 API Endpoints (v2.0)

### Core Operations
- `GET /api/` - API documentation and health status
- `GET /api/tropes` - List all tropes with relationship counts
- `GET /api/tropes/<id>` - Individual trope with related works and examples
- `GET /api/categories` - List all categories with trope counts
- `GET /api/search?q=<query>` - Advanced full-text search
- `GET /api/analytics` - Real-time database statistics
- `GET /api/export/csv` - Export data as CSV

### Works & Examples
- `GET /api/works` - List all works with filtering
- `POST /api/works` - Create new work entries
- `GET /api/works/<id>` - Work details with associated tropes
- `GET /api/examples` - List all trope-work relationships
- `POST /api/examples` - Create trope-work links

### Cross-Reference Navigation (New in v2.0)
- `GET /api/tropes/<id>/works` - Get all works using a specific trope
- `GET /api/works/<id>/tropes` - Get all tropes used in a specific work

### Write Operations
- `POST /api/tropes` - Create new trope with categories
- `PUT /api/tropes/<id>` - Update existing tropes
- `DELETE /api/tropes/<id>` - Delete tropes with confirmation

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
   
   # Option 2: Using smart development server (recommended)
   python scripts/dev_server.py start
   
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

Current data includes **155 tropes** with relationship counts, **23 categories**, **5+ works**, and **comprehensive cross-references**.

## Development

### Running Tests
```bash
# Using task runner (recommended)
python scripts/dev_server.py test

# Direct test running
python tests/run_tests.py
python -m pytest tests/test_api.py
python -m pytest tests/test_improvements.py
```

### Project Phases
- ✅ **Phase 1-3**: Backend API, frontend implementation, testing
- ✅ **Phase 4.1-4.5**: Complete CRUD operations, analytics, data export
- ✅ **Phase 5.0**: Works and Examples management with full integration
- ✅ **Phase 5.1**: Performance optimization and enhanced relationships (v2.0)

### Development Environment
- Flask 2.3.3 with 12 optimized API endpoints
- SQLite with 5 strategic performance indexes  
- Vanilla JavaScript with cross-reference navigation
- Winter theme UI with dark/light mode toggle
- Smart development server management

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and release notes.

**Current Version: 2.0** - Performance optimization and enhanced relationships complete

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Test thoroughly before committing

## Mission Statement

*"Build a fast, private, and user-friendly local web application for managing personal writing tropes database, with a clean web interface for CRUD operations and powerful searching capabilities."*

**Mission Status: ✅ COMPLETE** - All core objectives achieved with Phase 5.1 enhancements

## Technical Notes

- **Performance Optimized**: 5 strategic database indexes for fast queries
- **Cross-Reference Navigation**: Professional modal system with relationship indicators  
- **Winter Theme**: Dark/light mode toggle with consistent design language
- **Smart Development Server**: Background process management with status monitoring
- **Local-First**: All operations are private - no external API calls
- **Responsive Design**: Works seamlessly across all screen sizes

---

**Lab-8a Trope Management System v2.0** | Last updated: August 30, 2025