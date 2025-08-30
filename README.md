# Personal Trope Database

A fast, private, and user-friendly local web application for managing a personal database of writing tropes, genres, and literary devices.

## 🚀 Quick Start

### Prerequisites
- Python 3.7+ 
- macOS (or any Unix-like system)

### Installation & Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd /Users/carlo/Lab-8a
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database** (one-time setup):
   ```bash
   python scripts/csv_to_sqlite.py
   ```

5. **Start the application:**
   ```bash
   ./start_server.sh
   ```

6. **Open your web browser and visit:**
   ```
   http://localhost:8000
   ```

## 🎯 Current Features

### ✅ Phase 1: Backend API (Complete)
- **SQLite Database**: Normalized schema with 148 tropes and 23 categories
- **REST API Endpoints**:
  - `GET /` - Web interface
  - `GET /api/tropes` - List all tropes with formatted categories
  - `GET /api/tropes/{id}` - Get specific trope details
  - `GET /api/categories` - List all categories with trope counts (formatted display names)
  - `GET /api/categories/{id}/tropes` - Get tropes in a category
  - `GET /api/search?q={term}` - Advanced search across tropes and categories

### ✅ Phase 2: Web Frontend (Complete)
- **Clean Web Interface**: Responsive design optimized for browsing and reading
- **Trope Browser**: Grid view of all tropes with descriptions and formatted category tags
- **Category Browser**: Overview of all categories with proper Title Case formatting
- **Detail Views**: Click any trope or category for detailed information
- **Advanced Search**: Flexible, real-time search with multiple matching strategies
- **Navigation**: Smooth transitions between different views

### ✅ Phase 2.5: Enhanced UX (Complete)
- **Smart Category Formatting**: 
  - `"forced_situation"` → `"Forced Situation"`
  - `"age_gap"` → `"Age Gap"`
  - `"character_type"` → `"Character Type"`
- **Flexible Search**: Find categories using any variation:
  - Search `"forced"` finds `"Forced Situation"`
  - Search `"Forced Situation"` works perfectly
  - Search `"forced situation"` matches correctly
  - Case-insensitive matching throughout
- **Database-Optimized Search**: Fast SQL queries with intelligent ranking
- **Real-time Results**: Search updates as you type with result counts

## 🆕 Recent Improvements (August 2025)

### Enhanced Category Display
- **Smart Formatting**: All category names now display in proper Title Case
- **Readable Names**: Underscores automatically converted to spaces for better UX
- **Consistent Display**: Formatted names appear everywhere (lists, tags, search results)

### Advanced Search Capabilities  
- **New Search API**: Dedicated `/api/search` endpoint with database-level optimization
- **Flexible Matching**: Search works with any combination:
  - Original format: `"forced_situation"`
  - Formatted: `"Forced Situation"`  
  - Partial: `"forced"` or `"situation"`
  - Any case: `"FORCED"`, `"Forced"`, `"forced"`
- **Smart Ranking**: Results prioritized by relevance (name matches first, then descriptions)
- **Real-time Feedback**: Instant search results with detailed count breakdowns
- **Cross-Reference Search**: Find tropes by searching their category names

### Technical Enhancements
- **Performance**: Database-optimized search queries for faster results
- **Fallback Protection**: Client-side search backup if server search fails  
- **Better Error Handling**: Graceful degradation and user feedback
- **Enhanced API**: All endpoints now return formatted category names

## 🔧 Current Project Structure

```
/Users/carlo/Lab-8a/
├── app.py                 # Flask web application
├── requirements.txt       # Python dependencies
├── start_server.sh       # Easy server startup script
├── test_api.py           # API testing utilities
├── test_improvements.py  # Test category formatting and search
├── README.md             # This file
├── venv/                 # Python virtual environment
├── templates/
│   └── index.html        # Main web interface template
├── static/
│   ├── style.css         # Clean, responsive CSS
│   └── app.js           # Frontend JavaScript with advanced search
├── db/
│   └── genre_tropes.db   # SQLite database
├── data/
│   └── genre_tropes_data.csv  # Original CSV data
└── scripts/
    └── csv_to_sqlite.py  # Database initialization script
```

## 🖥️ Using the Application

### Browse Your Tropes
- **All Tropes**: View all 148 tropes in a clean grid layout
- **Click any trope** to see its full description and associated categories
- **Formatted category tags** show genres in readable Title Case format

### Explore Categories  
- **Categories view** shows all 23 writing categories with proper formatting
- **Title Case display**: `"forced_situation"` appears as `"Forced Situation"`
- **Click any category** to see all tropes in that genre
- **Trope counts** help you see which categories are most populated

### Advanced Search & Discovery
- **Global search bar** with flexible matching across all content
- **Multiple search strategies**:
  - Search `"forced"` → finds `"Forced Situation"` category
  - Search `"gap"` → finds `"Age Gap"` category  
  - Search `"character"` → finds multiple character-related categories
  - Search `"forced situation"` → matches with or without underscores
  - Case-insensitive matching works everywhere
- **Real-time results** update as you type with detailed counts
- **Smart ranking**: Name matches prioritized over description matches
- **Cross-reference search**: Find tropes by their category names

### Navigation & Interface
- **Clean navigation** between tropes and categories
- **Back buttons** return you to previous views  
- **Responsive design** works perfectly on desktop and mobile
- **Fast performance**: Database-optimized queries for instant results

## 🧪 Testing

Run the comprehensive test suite:
```bash
source venv/bin/activate
python test_api.py
```

Test the new improvements specifically:
```bash
source venv/bin/activate
python test_improvements.py
```

These tests will verify:
- Database connectivity and data integrity
- All API endpoints functionality  
- Frontend/backend integration
- Category name formatting
- Advanced search capabilities

## 📊 Database Schema

The application uses a normalized SQLite database:

- **tropes**: Core trope data (id, name, description)
- **categories**: Genre/category definitions (id, name)  
- **trope_categories**: Many-to-many relationships between tropes and categories

## 🔜 Next Steps (Planned)

### Phase 3: CRUD Operations  
- Add/edit/delete tropes via web interface
- Category management and creation
- Form validation and error handling
- Bulk operations for efficiency

### Phase 4: Works & Examples
- Add "Works" table (books, movies, TV shows)
- Link tropes to specific works with examples
- Cross-reference tropes across different media
- Media type categorization

### Phase 5: Advanced Features
- Export/import functionality (CSV, JSON)
- Advanced filtering options
- Search result highlighting
- User preferences and settings

### Phase 6: Containerization
- Docker setup for easy deployment
- docker-compose.yml for one-command startup
- Production-ready configuration
- Automated backup solutions

## 🛠️ Development

### Starting Development Server
```bash
cd /Users/carlo/Lab-8a
source venv/bin/activate
python app.py
```

The server runs in debug mode and automatically reloads when you make changes.

### API Endpoints Reference

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | Main web interface |
| `/api/tropes` | GET | List all tropes with formatted categories |
| `/api/tropes/{id}` | GET | Get specific trope details with formatted categories |
| `/api/categories` | GET | List all categories with formatted display names |
| `/api/categories/{id}/tropes` | GET | Get tropes in category with formatted names |
| `/api/search?q={term}` | GET | Advanced search across tropes and categories |

### Making Changes

The application uses:
- **Flask** for the web framework
- **SQLite** for the database
- **Vanilla JavaScript** for frontend interactivity
- **CSS Grid/Flexbox** for responsive layout

## 🎨 Design Philosophy

This application prioritizes:
- **Function over form**: Clean, fast, and practical
- **Single-user focus**: Personal tool, not public website
- **Minimal dependencies**: Easy to run and maintain
- **Progressive enhancement**: Works without JavaScript for basic functionality

---

*Built for creative writers who want a fast, private way to explore and organize literary tropes and story devices.*
