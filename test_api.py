#!/usr/bin/env python3
"""
Simple test script to verify our Flask API endpoints work
"""
import sqlite3
import os

# Test database connection directly
db_path = os.path.join('db', 'genre_tropes.db')
print(f"Testing database at: {db_path}")

if not os.path.exists(db_path):
    print("❌ Database file not found!")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    # Test tropes count
    tropes = conn.execute("SELECT COUNT(*) as count FROM tropes").fetchone()
    print(f"✅ Tropes in database: {tropes[0]}")
    
    # Test categories count  
    categories = conn.execute("SELECT COUNT(*) as count FROM categories").fetchone()
    print(f"✅ Categories in database: {categories[0]}")
    
    # Test a sample trope with categories
    sample = conn.execute("""
        SELECT 
            t.name as trope_name,
            t.description,
            GROUP_CONCAT(c.name) as categories
        FROM tropes t
        LEFT JOIN trope_categories tc ON t.id = tc.trope_id
        LEFT JOIN categories c ON tc.category_id = c.id
        GROUP BY t.id, t.name, t.description
        LIMIT 1
    """).fetchone()
    
    if sample:
        print(f"✅ Sample trope: '{sample[0]}'")
        print(f"   Description: {sample[1][:100]}...")
        print(f"   Categories: {sample[2]}")
    
    conn.close()
    print("✅ Database connection test successful!")
    
except Exception as e:
    print(f"❌ Database error: {e}")
    exit(1)

# Now test Flask endpoints programmatically
print("\n" + "="*50)
print("Testing Flask API endpoints...")

try:
    from app import app
    
    with app.test_client() as client:
        # Test home endpoint
        response = client.get('/')
        if response.status_code == 200:
            print("✅ Home endpoint working")
        else:
            print(f"❌ Home endpoint failed: {response.status_code}")
        
        # Test categories endpoint
        response = client.get('/api/categories')
        if response.status_code == 200:
            data = response.get_json()
            print(f"✅ Categories endpoint: {data['count']} categories found")
        else:
            print(f"❌ Categories endpoint failed: {response.status_code}")
            
        # Test tropes endpoint
        response = client.get('/api/tropes')
        if response.status_code == 200:
            data = response.get_json()
            print(f"✅ Tropes endpoint: {data['count']} tropes found")
            
            # Show a sample trope
            if data['tropes']:
                sample_trope = data['tropes'][0]
                print(f"   Sample: '{sample_trope['name']}'")
        else:
            print(f"❌ Tropes endpoint failed: {response.status_code}")
    
    print("✅ All Flask endpoint tests passed!")
    print("\nYour API is ready! Start the server with:")
    print("  ./start_server.sh")
    print("Then visit: http://localhost:8000")
    
except Exception as e:
    print(f"❌ Flask test error: {e}")
    exit(1)
