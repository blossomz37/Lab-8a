from flask import Flask, jsonify, request, render_template, send_file, make_response
from flask_cors import CORS
import sqlite3
import os
import uuid
import csv
import io
from datetime import datetime

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

def get_database_stats():
    """Get basic database statistics for API info"""
    try:
        conn = get_db_connection()
        
        tropes = conn.execute('SELECT COUNT(*) as count FROM tropes').fetchone()['count']
        categories = conn.execute('SELECT COUNT(*) as count FROM categories').fetchone()['count']
        works = conn.execute('SELECT COUNT(*) as count FROM works').fetchone()['count']
        examples = conn.execute('SELECT COUNT(*) as count FROM examples').fetchone()['count']
        
        conn.close()
        
        return {
            'tropes': tropes,
            'categories': categories,
            'works': works,
            'examples': examples
        }
    except:
        return {
            'tropes': 0,
            'categories': 0,
            'works': 0,
            'examples': 0
        }

@app.route('/')
def home():
    """Serve the main web interface"""
    return render_template('index.html', title="Personal Trope Database")

@app.route('/api')
def api_info():
    """API information and available endpoints"""
    return jsonify({
        "name": "Personal Trope Database API",
        "version": "5.0.0",
        "description": "API for managing tropes, categories, works, and examples",
        "endpoints": {
            "categories": "/api/categories",
            "tropes": "/api/tropes",
            "trope_detail": "/api/tropes/{id}",
            "works": "/api/works",
            "work_detail": "/api/works/{id}",
            "examples": "/api/examples", 
            "example_detail": "/api/examples/{id}",
            "search": "/api/search",
            "analytics": "/api/analytics",
            "export_csv": "/api/export/csv"
        },
        "features": [
            "Full CRUD operations for tropes",
            "Full CRUD operations for works",
            "Full CRUD operations for examples (trope-work links)",
            "Category management and filtering", 
            "Advanced sorting and search",
            "Data export and analytics",
            "Real-time statistics"
        ],
        "database_info": get_database_stats()
    })

@app.route('/api/tropes')
def get_tropes():
    """Get all tropes with their categories"""
    try:
        conn = get_db_connection()
        
        # Get all tropes with their associated categories and relationship counts
        query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories,
            COALESCE(example_stats.example_count, 0) as example_count,
            COALESCE(example_stats.work_count, 0) as work_count
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN (
            SELECT 
                e.trope_id,
                COUNT(*) as example_count,
                COUNT(DISTINCT e.work_id) as work_count
            FROM examples e
            GROUP BY e.trope_id
        ) example_stats ON t.id = example_stats.trope_id
        GROUP BY t.id, t.name, t.description, example_stats.example_count, example_stats.work_count
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

@app.route('/api/tropes', methods=['POST'])
def create_trope():
    """Create a new trope"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Trope name is required"}), 400
            
        if not data.get('description'):
            return jsonify({"error": "Trope description is required"}), 400
        
        name = data['name'].strip()
        description = data['description'].strip()
        category_ids = data.get('category_ids', [])
        category_names = data.get('categories', [])
        
        # Convert category names to IDs if provided
        if category_names and not category_ids:
            conn = get_db_connection()
            # Convert display names to database names (reverse of format_category_name)
            db_names = [name.lower().replace(' ', '_') for name in category_names]
            placeholders = ','.join(['?' for _ in db_names])
            category_rows = conn.execute(
                f'SELECT id, name FROM categories WHERE name IN ({placeholders})',
                db_names
            ).fetchall()
            category_ids = [row['id'] for row in category_rows]
            
            if len(category_ids) != len(category_names):
                found_names = [row['name'] for row in category_rows]
                missing_db_names = [name for name in db_names if name not in found_names]
                # Convert back to display names for error message
                missing_display = [name.replace('_', ' ').title() for name in missing_db_names]
                conn.close()
                return jsonify({"error": f"Invalid category names: {', '.join(missing_display)}"}), 400
            
            conn.close()
        
        # Validate name length
        if len(name) < 2:
            return jsonify({"error": "Trope name must be at least 2 characters"}), 400
            
        if len(name) > 200:
            return jsonify({"error": "Trope name must be less than 200 characters"}), 400
            
        # Validate description length
        if len(description) < 10:
            return jsonify({"error": "Trope description must be at least 10 characters"}), 400
            
        if len(description) > 2000:
            return jsonify({"error": "Trope description must be less than 2000 characters"}), 400
        
        conn = get_db_connection()
        
        # Check if trope name already exists
        existing = conn.execute(
            'SELECT id FROM tropes WHERE LOWER(name) = LOWER(?)', 
            (name,)
        ).fetchone()
        
        if existing:
            return jsonify({"error": "A trope with this name already exists"}), 409
        
        # Generate UUID for new trope
        trope_id = str(uuid.uuid4())
        
        # Insert the new trope
        cursor = conn.execute(
            'INSERT INTO tropes (id, name, description) VALUES (?, ?, ?)',
            (trope_id, name, description)
        )
        
        # Add category associations if provided
        if category_ids:
            # Validate that all category IDs exist
            placeholders = ','.join(['?' for _ in category_ids])
            valid_categories = conn.execute(
                f'SELECT id FROM categories WHERE id IN ({placeholders})',
                category_ids
            ).fetchall()
            
            if len(valid_categories) != len(category_ids):
                # Rollback the trope insertion
                conn.rollback()
                return jsonify({"error": "One or more category IDs are invalid"}), 400
            
            # Insert category associations
            for category_id in category_ids:
                conn.execute(
                    'INSERT INTO trope_categories (trope_id, category_id) VALUES (?, ?)',
                    (trope_id, category_id)
                )
        
        conn.commit()
        
        # Fetch the created trope with its categories for response
        query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories,
            GROUP_CONCAT(c.id) as category_ids
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE t.id = ?
        GROUP BY t.id, t.name, t.description
        """
        
        trope = conn.execute(query, (trope_id,)).fetchone()
        
        if trope:
            trope_dict = dict_from_row(trope)
            # Format categories
            if trope_dict['categories']:
                category_names = trope_dict['categories'].split(',')
                trope_dict['categories'] = [format_category_name(cat) for cat in category_names]
                trope_dict['category_ids'] = trope_dict['category_ids'].split(',')
            else:
                trope_dict['categories'] = []
                trope_dict['category_ids'] = []
            
            return jsonify({
                "message": "Trope created successfully",
                "trope": trope_dict
            }), 201
        else:
            return jsonify({"error": "Failed to retrieve created trope"}), 500
            
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
        
        # Get related examples with work information
        examples = conn.execute("""
            SELECT 
                e.id,
                e.description,
                e.page_reference,
                e.created_at,
                w.id as work_id,
                w.title as work_title,
                w.type as work_type,
                w.year as work_year,
                w.author as work_author
            FROM examples e
            JOIN works w ON e.work_id = w.id
            WHERE e.trope_id = ?
            ORDER BY w.title
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
        
        # Add examples with work details
        result['examples'] = []
        result['related_works'] = []
        work_ids_seen = set()
        
        for example in examples:
            example_dict = dict_from_row(example)
            result['examples'].append({
                'id': example_dict['id'],
                'description': example_dict['description'],
                'page_reference': example_dict['page_reference'],
                'created_at': example_dict['created_at'],
                'work': {
                    'id': example_dict['work_id'],
                    'title': example_dict['work_title'],
                    'type': example_dict['work_type'],
                    'year': example_dict['work_year'],
                    'author': example_dict['work_author']
                }
            })
            
            # Add to related works (avoid duplicates)
            if example_dict['work_id'] not in work_ids_seen:
                work_ids_seen.add(example_dict['work_id'])
                result['related_works'].append({
                    'id': example_dict['work_id'],
                    'title': example_dict['work_title'],
                    'type': example_dict['work_type'],
                    'year': example_dict['work_year'],
                    'author': example_dict['work_author']
                })
        
        # Add summary counts
        result['stats'] = {
            'example_count': len(result['examples']),
            'work_count': len(result['related_works']),
            'category_count': len(result['categories'])
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tropes/<trope_id>', methods=['PUT'])
def update_trope(trope_id):
    """Update an existing trope"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
            
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Trope name is required"}), 400
            
        if not data.get('description'):
            return jsonify({"error": "Trope description is required"}), 400
        
        name = data['name'].strip()
        description = data['description'].strip()
        category_ids = data.get('category_ids', [])
        category_names = data.get('categories', [])
        
        # Validate name length
        if len(name) < 2:
            return jsonify({"error": "Trope name must be at least 2 characters"}), 400
            
        if len(name) > 200:
            return jsonify({"error": "Trope name must be less than 200 characters"}), 400
            
        # Validate description length
        if len(description) < 10:
            return jsonify({"error": "Trope description must be at least 10 characters"}), 400
            
        if len(description) > 2000:
            return jsonify({"error": "Trope description must be less than 2000 characters"}), 400
        
        conn = get_db_connection()
        
        # Check if trope exists
        existing = conn.execute(
            'SELECT id FROM tropes WHERE id = ?', 
            (trope_id,)
        ).fetchone()
        
        if not existing:
            conn.close()
            return jsonify({"error": "Trope not found"}), 404
        
        # Check if another trope with this name already exists (excluding current trope)
        name_conflict = conn.execute(
            'SELECT id FROM tropes WHERE LOWER(name) = LOWER(?) AND id != ?', 
            (name, trope_id)
        ).fetchone()
        
        if name_conflict:
            conn.close()
            return jsonify({"error": "A trope with this name already exists"}), 409
        
        # Convert category names to IDs if provided
        if category_names and not category_ids:
            # Convert display names to database names (reverse of format_category_name)
            db_names = [name.lower().replace(' ', '_') for name in category_names]
            placeholders = ','.join(['?' for _ in db_names])
            category_rows = conn.execute(
                f'SELECT id, name FROM categories WHERE name IN ({placeholders})',
                db_names
            ).fetchall()
            category_ids = [row['id'] for row in category_rows]
            
            if len(category_ids) != len(category_names):
                found_names = [row['name'] for row in category_rows]
                missing_db_names = [name for name in db_names if name not in found_names]
                # Convert back to display names for error message
                missing_display = [name.replace('_', ' ').title() for name in missing_db_names]
                conn.close()
                return jsonify({"error": f"Invalid category names: {', '.join(missing_display)}"}), 400
        
        # Update the trope
        conn.execute(
            'UPDATE tropes SET name = ?, description = ? WHERE id = ?',
            (name, description, trope_id)
        )
        
        # Update category associations if provided
        if category_ids is not None:  # Allow empty list to clear categories
            # Remove existing category associations
            conn.execute('DELETE FROM trope_categories WHERE trope_id = ?', (trope_id,))
            
            # Add new category associations
            if category_ids:
                # Validate that all category IDs exist
                placeholders = ','.join(['?' for _ in category_ids])
                valid_categories = conn.execute(
                    f'SELECT id FROM categories WHERE id IN ({placeholders})',
                    category_ids
                ).fetchall()
                
                if len(valid_categories) != len(category_ids):
                    conn.rollback()
                    conn.close()
                    return jsonify({"error": "One or more category IDs are invalid"}), 400
                
                # Insert new category associations
                for category_id in category_ids:
                    conn.execute(
                        'INSERT INTO trope_categories (trope_id, category_id) VALUES (?, ?)',
                        (trope_id, category_id)
                    )
        
        conn.commit()
        
        # Fetch the updated trope with its categories for response
        query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories,
            GROUP_CONCAT(c.id) as category_ids
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE t.id = ?
        GROUP BY t.id, t.name, t.description
        """
        
        trope = conn.execute(query, (trope_id,)).fetchone()
        conn.close()
        
        if trope:
            trope_dict = dict_from_row(trope)
            # Format categories
            if trope_dict['categories']:
                category_names = trope_dict['categories'].split(',')
                trope_dict['categories'] = [format_category_name(cat) for cat in category_names]
                trope_dict['category_ids'] = trope_dict['category_ids'].split(',')
            else:
                trope_dict['categories'] = []
                trope_dict['category_ids'] = []
            
            return jsonify({
                "message": "Trope updated successfully",
                "trope": trope_dict
            }), 200
        else:
            return jsonify({"error": "Failed to retrieve updated trope"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tropes/<trope_id>', methods=['DELETE'])
def delete_trope(trope_id):
    """Delete an existing trope"""
    try:
        conn = get_db_connection()
        
        # Check if trope exists
        existing = conn.execute(
            'SELECT name FROM tropes WHERE id = ?', 
            (trope_id,)
        ).fetchone()
        
        if not existing:
            conn.close()
            return jsonify({"error": "Trope not found"}), 404
        
        trope_name = existing['name']
        
        # Delete category associations first (foreign key constraint)
        conn.execute('DELETE FROM trope_categories WHERE trope_id = ?', (trope_id,))
        
        # Delete the trope
        conn.execute('DELETE FROM tropes WHERE id = ?', (trope_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": f"Trope '{trope_name}' deleted successfully",
            "deleted_trope_id": trope_id
        }), 200
        
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

@app.route('/api/analytics')
def get_analytics():
    """Get database analytics and statistics"""
    try:
        conn = get_db_connection()
        
        # Basic counts
        trope_count = conn.execute('SELECT COUNT(*) as count FROM tropes').fetchone()['count']
        category_count = conn.execute('SELECT COUNT(*) as count FROM categories').fetchone()['count']
        
        # Category usage statistics
        category_usage = conn.execute("""
        SELECT 
            c.name,
            c.id,
            COUNT(tc.trope_id) as trope_count
        FROM categories c
        LEFT JOIN trope_categories tc ON c.id = tc.category_id
        GROUP BY c.id, c.name
        ORDER BY trope_count DESC
        """).fetchall()
        
        # Most popular categories
        popular_categories = []
        for cat in category_usage[:5]:
            popular_categories.append({
                'name': format_category_name(cat['name']),
                'trope_count': cat['trope_count']
            })
        
        # Calculate averages
        avg_categories_per_trope = conn.execute("""
        SELECT AVG(category_count) as avg_count
        FROM (
            SELECT COUNT(tc.category_id) as category_count
            FROM tropes t
            LEFT JOIN trope_categories tc ON t.id = tc.trope_id
            GROUP BY t.id
        )
        """).fetchone()['avg_count'] or 0
        
        conn.close()
        
        analytics = {
            'summary': {
                'total_tropes': trope_count,
                'total_categories': category_count,
                'avg_categories_per_trope': round(avg_categories_per_trope, 2)
            },
            'popular_categories': popular_categories,
            'category_distribution': [
                {
                    'name': format_category_name(cat['name']),
                    'count': cat['trope_count']
                } for cat in category_usage
            ]
        }
        
        return jsonify(analytics)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/csv')
def export_csv():
    """Export all tropes and categories to CSV format"""
    try:
        conn = get_db_connection()
        
        # Create CSV data in memory
        output = io.StringIO()
        
        # Export tropes with their categories
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
        
        # Write CSV headers
        fieldnames = ['id', 'name', 'description', 'categories']
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        # Write trope data
        for trope in tropes:
            writer.writerow({
                'id': trope['id'],
                'name': trope['name'],
                'description': trope['description'],
                'categories': trope['categories'] or ''
            })
        
        conn.close()
        
        # Create response
        csv_data = output.getvalue()
        output.close()
        
        # Return CSV as direct response
        response = make_response(csv_data)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'tropes_export_{timestamp}.csv'
        
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# WORKS API ENDPOINTS
# ======================

@app.route('/api/works')
def get_works():
    """Get all works with optional filtering and sorting"""
    try:
        conn = get_db_connection()
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        work_type = request.args.get('type', '').strip()
        sort_by = request.args.get('sort', 'title')  # title, year, author, type
        sort_order = request.args.get('order', 'asc')  # asc or desc
        
        # Build base query
        query = "SELECT * FROM works WHERE 1=1"
        params = []
        
        # Add search filter
        if search:
            query += " AND (title LIKE ? OR author LIKE ? OR description LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
        
        # Add type filter
        if work_type and work_type != 'all':
            query += " AND type = ?"
            params.append(work_type)
        
        # Add sorting
        valid_sort_fields = ['title', 'year', 'author', 'type', 'created_at']
        if sort_by not in valid_sort_fields:
            sort_by = 'title'
        
        sort_direction = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
        query += f" ORDER BY {sort_by} {sort_direction}"
        
        works = conn.execute(query, params).fetchall()
        
        # Convert to list of dictionaries
        works_list = [dict_from_row(work) for work in works]
        
        # Get total count for metadata
        count_query = "SELECT COUNT(*) as total FROM works WHERE 1=1"
        count_params = []
        
        if search:
            count_query += " AND (title LIKE ? OR author LIKE ? OR description LIKE ?)"
            search_term = f"%{search}%"
            count_params.extend([search_term, search_term, search_term])
        
        if work_type and work_type != 'all':
            count_query += " AND type = ?"
            count_params.append(work_type)
            
        total_count = conn.execute(count_query, count_params).fetchone()['total']
        
        conn.close()
        
        return jsonify({
            "works": works_list,
            "total": total_count,
            "filters": {
                "search": search,
                "type": work_type
            },
            "sorting": {
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/works', methods=['POST'])
def create_work():
    """Create a new work"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title') or not data.get('type'):
            return jsonify({"error": "Title and type are required"}), 400
        
        title = data.get('title', '').strip()
        work_type = data.get('type', '').strip()
        year = data.get('year')
        author = data.get('author', '').strip()
        description = data.get('description', '').strip()
        
        # Validate title length
        if len(title) < 1 or len(title) > 200:
            return jsonify({"error": "Title must be between 1 and 200 characters"}), 400
        
        # Validate type
        valid_types = ['Novel', 'Film', 'TV Show', 'Short Story', 'Comic', 'Game', 'Other']
        if work_type not in valid_types:
            return jsonify({"error": f"Type must be one of: {', '.join(valid_types)}"}), 400
        
        # Validate year if provided
        if year is not None:
            try:
                year = int(year)
                if year < 1000 or year > 2100:
                    return jsonify({"error": "Year must be between 1000 and 2100"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Year must be a valid number"}), 400
        
        # Validate author length
        if author and len(author) > 100:
            return jsonify({"error": "Author must be 100 characters or less"}), 400
        
        # Validate description length
        if description and len(description) > 2000:
            return jsonify({"error": "Description must be 2000 characters or less"}), 400
        
        # Generate UUID and timestamps
        work_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Insert into database
        conn = get_db_connection()
        
        # Check for duplicate title
        existing = conn.execute("SELECT id FROM works WHERE title = ?", (title,)).fetchone()
        if existing:
            conn.close()
            return jsonify({"error": "A work with this title already exists"}), 400
        
        conn.execute("""
            INSERT INTO works (id, title, type, year, author, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (work_id, title, work_type, year, author, description, timestamp, timestamp))
        
        conn.commit()
        
        # Fetch the created work
        new_work = conn.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        conn.close()
        
        return jsonify({
            "message": "Work created successfully",
            "work": dict_from_row(new_work)
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/works/<work_id>')
def get_work(work_id):
    """Get a specific work by ID with related tropes"""
    try:
        conn = get_db_connection()
        
        # Get the work
        work = conn.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        
        if not work:
            conn.close()
            return jsonify({"error": "Work not found"}), 404
        
        # Get related tropes through examples
        examples_query = """
        SELECT 
            e.id as example_id,
            e.description as example_description,
            e.page_reference,
            t.id as trope_id,
            t.name as trope_name,
            t.description as trope_description
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        WHERE e.work_id = ?
        ORDER BY t.name
        """
        
        examples = conn.execute(examples_query, (work_id,)).fetchall()
        
        conn.close()
        
        # Format response
        work_data = dict_from_row(work)
        work_data['examples'] = [dict_from_row(example) for example in examples]
        work_data['trope_count'] = len(examples)
        
        return jsonify(work_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tropes/<trope_id>/works')
def get_trope_works(trope_id):
    """Get all works that use a specific trope"""
    try:
        conn = get_db_connection()
        
        # Verify trope exists
        trope = conn.execute("SELECT name FROM tropes WHERE id = ?", (trope_id,)).fetchone()
        if not trope:
            conn.close()
            return jsonify({"error": "Trope not found"}), 404
        
        # Get works with example details
        query = """
        SELECT 
            w.id,
            w.title,
            w.type,
            w.year,
            w.author,
            w.description,
            e.id as example_id,
            e.description as example_description,
            e.page_reference,
            e.created_at as example_created_at
        FROM works w
        JOIN examples e ON w.id = e.work_id
        WHERE e.trope_id = ?
        ORDER BY w.title
        """
        
        results = conn.execute(query, (trope_id,)).fetchall()
        conn.close()
        
        # Group by work
        works_dict = {}
        for row in results:
            row_dict = dict_from_row(row)
            work_id = row_dict['id']
            
            if work_id not in works_dict:
                works_dict[work_id] = {
                    'id': work_id,
                    'title': row_dict['title'],
                    'type': row_dict['type'],
                    'year': row_dict['year'],
                    'author': row_dict['author'],
                    'description': row_dict['description'],
                    'examples': []
                }
            
            works_dict[work_id]['examples'].append({
                'id': row_dict['example_id'],
                'description': row_dict['example_description'],
                'page_reference': row_dict['page_reference'],
                'created_at': row_dict['example_created_at']
            })
        
        return jsonify({
            'trope_name': trope['name'],
            'trope_id': trope_id,
            'works': list(works_dict.values()),
            'work_count': len(works_dict)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/works/<work_id>/tropes')
def get_work_tropes(work_id):
    """Get all tropes used in a specific work"""
    try:
        conn = get_db_connection()
        
        # Verify work exists
        work = conn.execute("SELECT title FROM works WHERE id = ?", (work_id,)).fetchone()
        if not work:
            conn.close()
            return jsonify({"error": "Work not found"}), 404
        
        # Get tropes with example details
        query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories,
            e.id as example_id,
            e.description as example_description,
            e.page_reference,
            e.created_at as example_created_at
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        JOIN examples e ON t.id = e.trope_id
        WHERE e.work_id = ?
        GROUP BY t.id, t.name, t.description, e.id, e.description, e.page_reference, e.created_at
        ORDER BY t.name
        """
        
        results = conn.execute(query, (work_id,)).fetchall()
        conn.close()
        
        # Group by trope
        tropes_dict = {}
        for row in results:
            row_dict = dict_from_row(row)
            trope_id = row_dict['id']
            
            if trope_id not in tropes_dict:
                # Format categories
                categories = []
                if row_dict['categories']:
                    category_names = row_dict['categories'].split(',')
                    categories = [format_category_name(cat) for cat in category_names]
                
                tropes_dict[trope_id] = {
                    'id': trope_id,
                    'name': row_dict['name'],
                    'description': row_dict['description'],
                    'categories': categories,
                    'example': {
                        'id': row_dict['example_id'],
                        'description': row_dict['example_description'],
                        'page_reference': row_dict['page_reference'],
                        'created_at': row_dict['example_created_at']
                    }
                }
        
        return jsonify({
            'work_title': work['title'],
            'work_id': work_id,
            'tropes': list(tropes_dict.values()),
            'trope_count': len(tropes_dict)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/works/<work_id>', methods=['PUT'])
def update_work(work_id):
    """Update an existing work"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        conn = get_db_connection()
        
        # Check if work exists
        existing_work = conn.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        if not existing_work:
            conn.close()
            return jsonify({"error": "Work not found"}), 404
        
        # Get current values as defaults
        current = dict_from_row(existing_work)
        
        title = data.get('title', current['title']).strip()
        work_type = data.get('type', current['type']).strip()
        year = data.get('year', current['year'])
        author = data.get('author', current['author'] or '').strip()
        description = data.get('description', current['description'] or '').strip()
        
        # Validate title
        if len(title) < 1 or len(title) > 200:
            conn.close()
            return jsonify({"error": "Title must be between 1 and 200 characters"}), 400
        
        # Validate type
        valid_types = ['Novel', 'Film', 'TV Show', 'Short Story', 'Comic', 'Game', 'Other']
        if work_type not in valid_types:
            conn.close()
            return jsonify({"error": f"Type must be one of: {', '.join(valid_types)}"}), 400
        
        # Validate year if provided
        if year is not None:
            try:
                year = int(year)
                if year < 1000 or year > 2100:
                    conn.close()
                    return jsonify({"error": "Year must be between 1000 and 2100"}), 400
            except (ValueError, TypeError):
                conn.close()
                return jsonify({"error": "Year must be a valid number"}), 400
        
        # Validate lengths
        if author and len(author) > 100:
            conn.close()
            return jsonify({"error": "Author must be 100 characters or less"}), 400
        
        if description and len(description) > 2000:
            conn.close()
            return jsonify({"error": "Description must be 2000 characters or less"}), 400
        
        # Check for duplicate title (excluding current work)
        duplicate_check = conn.execute(
            "SELECT id FROM works WHERE title = ? AND id != ?", 
            (title, work_id)
        ).fetchone()
        
        if duplicate_check:
            conn.close()
            return jsonify({"error": "A work with this title already exists"}), 400
        
        # Update the work
        timestamp = datetime.now().isoformat()
        
        conn.execute("""
            UPDATE works 
            SET title = ?, type = ?, year = ?, author = ?, description = ?, updated_at = ?
            WHERE id = ?
        """, (title, work_type, year, author, description, timestamp, work_id))
        
        conn.commit()
        
        # Fetch updated work
        updated_work = conn.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        conn.close()
        
        return jsonify({
            "message": "Work updated successfully",
            "work": dict_from_row(updated_work)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/works/<work_id>', methods=['DELETE'])
def delete_work(work_id):
    """Delete a work and all its examples"""
    try:
        conn = get_db_connection()
        
        # Check if work exists
        work = conn.execute("SELECT * FROM works WHERE id = ?", (work_id,)).fetchone()
        if not work:
            conn.close()
            return jsonify({"error": "Work not found"}), 404
        
        # Get count of examples that will be deleted
        example_count = conn.execute(
            "SELECT COUNT(*) as count FROM examples WHERE work_id = ?", 
            (work_id,)
        ).fetchone()['count']
        
        # Delete the work (examples will be deleted automatically due to CASCADE)
        conn.execute("DELETE FROM works WHERE id = ?", (work_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Work deleted successfully",
            "deleted_work": dict_from_row(work),
            "deleted_examples": example_count
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# EXAMPLES API ENDPOINTS  
# ======================

@app.route('/api/examples')
def get_examples():
    """Get all examples with optional filtering and sorting"""
    try:
        conn = get_db_connection()
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        trope_id = request.args.get('trope_id', '').strip()
        work_id = request.args.get('work_id', '').strip()
        sort_by = request.args.get('sort', 'created_at')  # created_at, trope_name, work_title
        sort_order = request.args.get('order', 'desc')  # asc or desc
        
        # Build base query with joins for trope and work information
        query = """
        SELECT 
            e.id,
            e.trope_id,
            e.work_id,
            e.description,
            e.page_reference,
            e.created_at,
            e.updated_at,
            t.name as trope_name,
            t.description as trope_description,
            w.title as work_title,
            w.type as work_type,
            w.year as work_year,
            w.author as work_author
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id  
        JOIN works w ON e.work_id = w.id
        WHERE 1=1
        """
        params = []
        
        # Add search filter (searches example descriptions and page references)
        if search:
            query += " AND (e.description LIKE ? OR e.page_reference LIKE ? OR t.name LIKE ? OR w.title LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term, search_term])
        
        # Add trope filter
        if trope_id:
            query += " AND e.trope_id = ?"
            params.append(trope_id)
        
        # Add work filter  
        if work_id:
            query += " AND e.work_id = ?"
            params.append(work_id)
        
        # Add sorting
        sort_fields_map = {
            'created_at': 'e.created_at',
            'trope_name': 't.name',
            'work_title': 'w.title',
            'description': 'e.description'
        }
        
        sort_field = sort_fields_map.get(sort_by, 'e.created_at')
        sort_direction = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
        query += f" ORDER BY {sort_field} {sort_direction}"
        
        examples = conn.execute(query, params).fetchall()
        
        # Convert to list of dictionaries
        examples_list = [dict_from_row(example) for example in examples]
        
        # Get total count for metadata
        count_query = """
        SELECT COUNT(*) as total 
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        JOIN works w ON e.work_id = w.id
        WHERE 1=1
        """
        count_params = []
        
        if search:
            count_query += " AND (e.description LIKE ? OR e.page_reference LIKE ? OR t.name LIKE ? OR w.title LIKE ?)"
            search_term = f"%{search}%"
            count_params.extend([search_term, search_term, search_term, search_term])
        
        if trope_id:
            count_query += " AND e.trope_id = ?"
            count_params.append(trope_id)
            
        if work_id:
            count_query += " AND e.work_id = ?"
            count_params.append(work_id)
            
        total_count = conn.execute(count_query, count_params).fetchone()['total']
        
        conn.close()
        
        return jsonify({
            "examples": examples_list,
            "total": total_count,
            "filters": {
                "search": search,
                "trope_id": trope_id,
                "work_id": work_id
            },
            "sorting": {
                "sort_by": sort_by,
                "sort_order": sort_order
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/examples', methods=['POST'])
def create_example():
    """Create a new example linking a trope to a work"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('trope_id') or not data.get('work_id') or not data.get('description'):
            return jsonify({"error": "trope_id, work_id, and description are required"}), 400
        
        trope_id = data.get('trope_id', '').strip()
        work_id = data.get('work_id', '').strip()
        description = data.get('description', '').strip()
        page_reference = data.get('page_reference', '').strip()
        
        # Validate description length
        if len(description) < 5 or len(description) > 2000:
            return jsonify({"error": "Description must be between 5 and 2000 characters"}), 400
        
        # Validate page_reference length
        if page_reference and len(page_reference) > 100:
            return jsonify({"error": "Page reference must be 100 characters or less"}), 400
        
        conn = get_db_connection()
        
        # Validate that trope exists
        trope = conn.execute("SELECT id, name FROM tropes WHERE id = ?", (trope_id,)).fetchone()
        if not trope:
            conn.close()
            return jsonify({"error": "Trope not found"}), 400
        
        # Validate that work exists
        work = conn.execute("SELECT id, title FROM works WHERE id = ?", (work_id,)).fetchone()
        if not work:
            conn.close()
            return jsonify({"error": "Work not found"}), 400
        
        # Check for duplicate example (same trope + work combination)
        existing = conn.execute(
            "SELECT id FROM examples WHERE trope_id = ? AND work_id = ?", 
            (trope_id, work_id)
        ).fetchone()
        if existing:
            conn.close()
            return jsonify({"error": "An example already exists for this trope and work combination"}), 400
        
        # Generate UUID and timestamps
        example_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Insert into database
        conn.execute("""
            INSERT INTO examples (id, trope_id, work_id, description, page_reference, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (example_id, trope_id, work_id, description, page_reference, timestamp, timestamp))
        
        conn.commit()
        
        # Fetch the created example with related data
        example_query = """
        SELECT 
            e.id, e.trope_id, e.work_id, e.description, e.page_reference, e.created_at, e.updated_at,
            t.name as trope_name, w.title as work_title, w.type as work_type
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        JOIN works w ON e.work_id = w.id
        WHERE e.id = ?
        """
        
        new_example = conn.execute(example_query, (example_id,)).fetchone()
        conn.close()
        
        return jsonify({
            "message": "Example created successfully",
            "example": dict_from_row(new_example)
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/examples/<example_id>')
def get_example(example_id):
    """Get a specific example by ID with related trope and work data"""
    try:
        conn = get_db_connection()
        
        # Get the example with related trope and work information
        example_query = """
        SELECT 
            e.id, e.trope_id, e.work_id, e.description, e.page_reference, e.created_at, e.updated_at,
            t.name as trope_name, t.description as trope_description,
            w.title as work_title, w.type as work_type, w.year as work_year, w.author as work_author
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        JOIN works w ON e.work_id = w.id
        WHERE e.id = ?
        """
        
        example = conn.execute(example_query, (example_id,)).fetchone()
        
        if not example:
            conn.close()
            return jsonify({"error": "Example not found"}), 404
        
        conn.close()
        
        return jsonify(dict_from_row(example))
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/examples/<example_id>', methods=['PUT'])
def update_example(example_id):
    """Update an existing example"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        conn = get_db_connection()
        
        # Check if example exists
        existing_example = conn.execute("SELECT * FROM examples WHERE id = ?", (example_id,)).fetchone()
        if not existing_example:
            conn.close()
            return jsonify({"error": "Example not found"}), 404
        
        # Get current values as defaults
        current = dict_from_row(existing_example)
        
        trope_id = data.get('trope_id', current['trope_id']).strip()
        work_id = data.get('work_id', current['work_id']).strip()
        description = data.get('description', current['description']).strip()
        page_reference = data.get('page_reference', current['page_reference'] or '').strip()
        
        # Validate description
        if len(description) < 5 or len(description) > 2000:
            conn.close()
            return jsonify({"error": "Description must be between 5 and 2000 characters"}), 400
        
        # Validate page_reference length
        if page_reference and len(page_reference) > 100:
            conn.close()
            return jsonify({"error": "Page reference must be 100 characters or less"}), 400
        
        # Validate that trope exists (if changed)
        if trope_id != current['trope_id']:
            trope = conn.execute("SELECT id FROM tropes WHERE id = ?", (trope_id,)).fetchone()
            if not trope:
                conn.close()
                return jsonify({"error": "Trope not found"}), 400
        
        # Validate that work exists (if changed)
        if work_id != current['work_id']:
            work = conn.execute("SELECT id FROM works WHERE id = ?", (work_id,)).fetchone()
            if not work:
                conn.close()
                return jsonify({"error": "Work not found"}), 400
        
        # Check for duplicate if trope_id or work_id changed
        if trope_id != current['trope_id'] or work_id != current['work_id']:
            duplicate_check = conn.execute(
                "SELECT id FROM examples WHERE trope_id = ? AND work_id = ? AND id != ?", 
                (trope_id, work_id, example_id)
            ).fetchone()
            
            if duplicate_check:
                conn.close()
                return jsonify({"error": "An example already exists for this trope and work combination"}), 400
        
        # Update the example
        timestamp = datetime.now().isoformat()
        
        conn.execute("""
            UPDATE examples 
            SET trope_id = ?, work_id = ?, description = ?, page_reference = ?, updated_at = ?
            WHERE id = ?
        """, (trope_id, work_id, description, page_reference, timestamp, example_id))
        
        conn.commit()
        
        # Fetch updated example with related data
        example_query = """
        SELECT 
            e.id, e.trope_id, e.work_id, e.description, e.page_reference, e.created_at, e.updated_at,
            t.name as trope_name, w.title as work_title, w.type as work_type
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        JOIN works w ON e.work_id = w.id
        WHERE e.id = ?
        """
        
        updated_example = conn.execute(example_query, (example_id,)).fetchone()
        conn.close()
        
        return jsonify({
            "message": "Example updated successfully",
            "example": dict_from_row(updated_example)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/examples/<example_id>', methods=['DELETE'])
def delete_example(example_id):
    """Delete an example"""
    try:
        conn = get_db_connection()
        
        # Get example with related data before deletion
        example_query = """
        SELECT 
            e.id, e.trope_id, e.work_id, e.description, e.page_reference, e.created_at, e.updated_at,
            t.name as trope_name, w.title as work_title, w.type as work_type
        FROM examples e
        JOIN tropes t ON e.trope_id = t.id
        JOIN works w ON e.work_id = w.id
        WHERE e.id = ?
        """
        
        example = conn.execute(example_query, (example_id,)).fetchone()
        if not example:
            conn.close()
            return jsonify({"error": "Example not found"}), 404
        
        # Delete the example
        conn.execute("DELETE FROM examples WHERE id = ?", (example_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Example deleted successfully",
            "deleted_example": dict_from_row(example)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def main():
    """Main entry point for the application."""
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("Please run the CSV import script first.")
        exit(1)
    
    print(f"Starting Flask app with database at: {DB_PATH}")
    app.run(debug=True, host='0.0.0.0', port=8000, use_reloader=False)

if __name__ == '__main__':
    main()
