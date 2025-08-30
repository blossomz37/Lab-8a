from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration later

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'db', 'genre_tropes.db')

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This makes rows behave like dictionaries
    return conn

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    return {key: row[key] for key in row.keys()}

def format_category_name(name):
    """Convert category name to Title Case and replace underscores with spaces"""
    if not name:
        return name
    # Replace underscores with spaces and convert to title case
    return name.replace('_', ' ').title()

def normalize_search_term(text):
    """Normalize text for search comparison"""
    if not text:
        return ""
    # Convert to lowercase and replace underscores with spaces for search
    return text.lower().replace('_', ' ')

@app.route('/')
def home():
    """Serve the main web interface"""
    return render_template('index.html', title="Personal Trope Database")

@app.route('/api')
def api_info():
    """Basic API documentation endpoint"""
    return jsonify({
        "message": "Trope Database API is running!",
        "endpoints": {
            "tropes": "/api/tropes",
            "categories": "/api/categories",
            "trope_detail": "/api/tropes/{id}"
        }
    })

@app.route('/api/tropes')
def get_tropes():
    """Get all tropes with their categories"""
    try:
        conn = get_db_connection()
        
        # Get all tropes with their associated categories
        query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        GROUP BY t.id, t.name, t.description
        ORDER BY t.name
        """
        
        tropes = conn.execute(query).fetchall()
        conn.close()
        
        # Convert to list of dictionaries and split categories
        result = []
        for trope in tropes:
            trope_dict = dict_from_row(trope)
            # Split categories into a list (handle None case)
            if trope_dict['categories']:
                # Format each category name
                category_names = trope_dict['categories'].split(',')
                trope_dict['categories'] = [format_category_name(cat) for cat in category_names]
            else:
                trope_dict['categories'] = []
            result.append(trope_dict)
        
        return jsonify({
            "count": len(result),
            "tropes": result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tropes/<trope_id>')
def get_trope_detail(trope_id):
    """Get detailed information about a specific trope"""
    try:
        conn = get_db_connection()
        
        # Get the trope
        trope = conn.execute(
            "SELECT * FROM tropes WHERE id = ?", (trope_id,)
        ).fetchone()
        
        if not trope:
            conn.close()
            return jsonify({"error": "Trope not found"}), 404
        
        # Get associated categories
        categories = conn.execute("""
            SELECT c.id, c.name
            FROM categories c
            JOIN trope_categories tc ON c.id = tc.category_id
            WHERE tc.trope_id = ?
        """, (trope_id,)).fetchall()
        
        conn.close()
        
        # Build response
        result = dict_from_row(trope)
        result['categories'] = [
            {
                'id': cat['id'], 
                'name': format_category_name(cat['name'])
            } for cat in [dict_from_row(cat) for cat in categories]
        ]
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories')
def get_categories():
    """Get all categories with trope counts"""
    try:
        conn = get_db_connection()
        
        # Get categories with trope counts
        query = """
        SELECT 
            c.id,
            c.name,
            COUNT(tc.trope_id) as trope_count
        FROM categories c
        LEFT JOIN trope_categories tc ON c.id = tc.category_id
        GROUP BY c.id, c.name
        ORDER BY c.name
        """
        
        categories = conn.execute(query).fetchall()
        conn.close()
        
        # Format category names for display
        result = []
        for cat in categories:
            cat_dict = dict_from_row(cat)
            cat_dict['display_name'] = format_category_name(cat_dict['name'])
            result.append(cat_dict)
        
        return jsonify({
            "count": len(result),
            "categories": result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/<category_id>/tropes')
def get_tropes_by_category(category_id):
    """Get all tropes in a specific category"""
    try:
        conn = get_db_connection()
        
        # First, check if category exists and get its name
        category = conn.execute(
            "SELECT * FROM categories WHERE id = ?", (category_id,)
        ).fetchone()
        
        if not category:
            conn.close()
            return jsonify({"error": "Category not found"}), 404
        
        # Get tropes in this category
        tropes = conn.execute("""
            SELECT t.id, t.name, t.description
            FROM tropes t
            JOIN trope_categories tc ON t.id = tc.trope_id
            WHERE tc.category_id = ?
            ORDER BY t.name
        """, (category_id,)).fetchall()
        
        conn.close()
        
        result = {
            "category": {
                'id': dict_from_row(category)['id'],
                'name': dict_from_row(category)['name'],
                'display_name': format_category_name(dict_from_row(category)['name'])
            },
            "trope_count": len(tropes),
            "tropes": [dict_from_row(trope) for trope in tropes]
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search')
def search():
    """Search tropes and categories with flexible matching"""
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({
            "query": "",
            "tropes": [],
            "categories": [],
            "total_results": 0
        })
    
    try:
        conn = get_db_connection()
        
        # Normalize search query for flexible matching
        normalized_query = normalize_search_term(query)
        search_pattern = f"%{normalized_query}%"
        
        # Search tropes - search in name and description
        trope_query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE 
            LOWER(t.name) LIKE ? OR 
            LOWER(t.description) LIKE ? OR
            LOWER(REPLACE(c.name, '_', ' ')) LIKE ?
        GROUP BY t.id, t.name, t.description
        ORDER BY 
            CASE 
                WHEN LOWER(t.name) LIKE ? THEN 1
                WHEN LOWER(t.description) LIKE ? THEN 2
                ELSE 3
            END,
            t.name
        """
        
        tropes = conn.execute(trope_query, (
            search_pattern, search_pattern, search_pattern,
            search_pattern, search_pattern
        )).fetchall()
        
        # Search categories - search in formatted name
        category_query = """
        SELECT 
            c.id,
            c.name,
            COUNT(tc.trope_id) as trope_count
        FROM categories c
        LEFT JOIN trope_categories tc ON c.id = tc.category_id
        WHERE LOWER(REPLACE(c.name, '_', ' ')) LIKE ?
        GROUP BY c.id, c.name
        ORDER BY c.name
        """
        
        categories = conn.execute(category_query, (search_pattern,)).fetchall()
        conn.close()
        
        # Format results
        trope_results = []
        for trope in tropes:
            trope_dict = dict_from_row(trope)
            if trope_dict['categories']:
                category_names = trope_dict['categories'].split(',')
                trope_dict['categories'] = [format_category_name(cat) for cat in category_names]
            else:
                trope_dict['categories'] = []
            trope_results.append(trope_dict)
        
        category_results = []
        for cat in categories:
            cat_dict = dict_from_row(cat)
            cat_dict['display_name'] = format_category_name(cat_dict['name'])
            category_results.append(cat_dict)
        
        return jsonify({
            "query": query,
            "tropes": trope_results,
            "categories": category_results,
            "total_results": len(trope_results) + len(category_results)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("Please run the CSV import script first.")
        exit(1)
    
    print(f"Starting Flask app with database at: {DB_PATH}")
    app.run(debug=True, host='0.0.0.0', port=8000)
