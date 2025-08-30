# Phase 4.5 Export and Analytics Endpoints
# To be integrated into app.py

# Additional imports needed:
# from flask import send_file
# import csv
# import io
# from datetime import datetime

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
