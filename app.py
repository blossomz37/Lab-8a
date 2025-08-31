from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
import uuid
import json
import csv
import io
import tempfile
import os
from datetime import datetime
            "trope_detail": "/api/tropes/{id}",
            "search": "/api/search",
            "analytics": "/api/analytics",
            "export_csv": "/api/export/csv",
            "export_json": "/api/export/json"
        },
        "features": [
            "Full CRUD operations for tropes",
            "Category management and filtering", 
            "Advanced sorting and search",
            "Data export and analytics",
            "Real-time statistics"
        ]
    })end_file
from flask_cors import CORS
import sqlite3
import uuid
import json
import csv
import io
import tempfile
import os
from datetime import datetime
from flask_cors import CORS
import sqlite3
import os
import uuid

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
    """Get all tropes with their categories, supports sorting and filtering"""
    try:
        conn = get_db_connection()
        
        # Get query parameters
        sort_by = request.args.get('sort', 'name')  # name, description
        sort_order = request.args.get('order', 'asc')  # asc, desc
        filter_category = request.args.get('filter_category', None)
        
        # Validate sort parameters
        valid_sorts = ['name', 'description']
        valid_orders = ['asc', 'desc']
        
        if sort_by not in valid_sorts:
            sort_by = 'name'
        if sort_order not in valid_orders:
            sort_order = 'asc'
        
        # Build base query
        base_query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.name) as categories,
            GROUP_CONCAT(c.id) as category_ids
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        """
        
        # Add category filtering if specified
        where_clause = ""
        params = []
        
        if filter_category:
            where_clause = """
            WHERE t.id IN (
                SELECT DISTINCT tc2.trope_id 
                FROM trope_categories tc2 
                JOIN categories c2 ON tc2.category_id = c2.id 
                WHERE c2.name = ?
            )
            """
            params.append(filter_category)
        
        # Complete query with grouping and sorting
        query = f"""
        {base_query}
        {where_clause}
        GROUP BY t.id, t.name, t.description
        ORDER BY t.{sort_by} {sort_order.upper()}
        """
        
        tropes = conn.execute(query, params).fetchall()
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
                # Keep category IDs for internal use
                if 'category_ids' in trope_dict and trope_dict['category_ids']:
                    trope_dict['category_ids'] = trope_dict['category_ids'].split(',')
                else:
                    trope_dict['category_ids'] = []
            else:
                trope_dict['categories'] = []
                trope_dict['category_ids'] = []
            result.append(trope_dict)
        
        return jsonify({
            "count": len(result),
            "tropes": result,
            "sort_by": sort_by,
            "sort_order": sort_order,
            "filter_category": filter_category
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
        
        # Create file-like object for download
        csv_buffer = io.BytesIO()
        csv_buffer.write(csv_data.encode('utf-8'))
        csv_buffer.seek(0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'tropes_export_{timestamp}.csv'
        
        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export/json')
def export_json():
    """Export complete database backup in JSON format"""
    try:
        conn = get_db_connection()
        
        # Export tropes
        trope_query = """
        SELECT 
            t.id,
            t.name,
            t.description,
            GROUP_CONCAT(c.id) as category_ids,
            GROUP_CONCAT(c.name) as category_names
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        GROUP BY t.id, t.name, t.description
        ORDER BY t.name
        """
        
        tropes = conn.execute(trope_query).fetchall()
        tropes_data = []
        
        for trope in tropes:
            trope_dict = dict_from_row(trope)
            if trope_dict['category_ids']:
                trope_dict['category_ids'] = trope_dict['category_ids'].split(',')
                trope_dict['category_names'] = [format_category_name(cat) for cat in trope_dict['category_names'].split(',')]
            else:
                trope_dict['category_ids'] = []
                trope_dict['category_names'] = []
            tropes_data.append(trope_dict)
        
        # Export categories
        categories = conn.execute('SELECT * FROM categories ORDER BY name').fetchall()
        categories_data = [dict_from_row(cat) for cat in categories]
        
        conn.close()
        
        # Create complete backup
        backup_data = {
            'export_info': {
                'timestamp': datetime.now().isoformat(),
                'version': '1.0',
                'application': 'Personal Trope Database'
            },
            'statistics': {
                'total_tropes': len(tropes_data),
                'total_categories': len(categories_data)
            },
            'tropes': tropes_data,
            'categories': categories_data
        }
        
        # Create JSON response
        json_data = json.dumps(backup_data, indent=2)
        json_buffer = io.BytesIO()
        json_buffer.write(json_data.encode('utf-8'))
        json_buffer.seek(0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'tropes_backup_{timestamp}.json'
        
        return send_file(
            json_buffer,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
        
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
        
        # Unused categories
        unused_categories = conn.execute("""
        SELECT c.name
        FROM categories c
        LEFT JOIN trope_categories tc ON c.id = tc.category_id
        WHERE tc.category_id IS NULL
        """).fetchall()
        
        conn.close()
        
        analytics = {
            'summary': {
                'total_tropes': trope_count,
                'total_categories': category_count,
                'avg_categories_per_trope': round(avg_categories_per_trope, 2),
                'unused_categories': len(unused_categories)
            },
            'popular_categories': popular_categories,
            'category_distribution': [
                {
                    'name': format_category_name(cat['name']),
                    'count': cat['trope_count']
                } for cat in category_usage
            ],
            'data_health': {
                'unused_categories': [format_category_name(cat['name']) for cat in unused_categories],
                'database_size': f"{trope_count + category_count} total records"
            }
        }
        
        return jsonify(analytics)
        
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
