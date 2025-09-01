#!/usr/bin/env python3
"""
Import works from works.json file into the database
Handles trope mapping and creates examples relationships
"""

import json
import sqlite3
import uuid
import os
from datetime import datetime
from pathlib import Path

# Get project paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "db" / "genre_tropes.db"
WORKS_JSON_PATH = PROJECT_ROOT / "data" / "works.json"

def generate_uuid():
    return str(uuid.uuid4())

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_trope_name(name):
    """Normalize trope name for matching"""
    return name.lower().strip()

def find_matching_trope(conn, trope_name):
    """Find a matching trope in the database by name"""
    normalized_name = normalize_trope_name(trope_name)
    
    # Try exact match first
    result = conn.execute("""
        SELECT id, name FROM tropes 
        WHERE LOWER(TRIM(name)) = ?
    """, (normalized_name,)).fetchone()
    
    if result:
        return result
    
    # Try partial matches (contains)
    result = conn.execute("""
        SELECT id, name FROM tropes 
        WHERE LOWER(name) LIKE ?
        LIMIT 1
    """, (f'%{normalized_name}%',)).fetchone()
    
    if result:
        return result
    
    # Try reverse match (input contains db name)
    results = conn.execute("SELECT id, name FROM tropes").fetchall()
    for trope in results:
        db_name = normalize_trope_name(trope['name'])
        if db_name in normalized_name or normalized_name in db_name:
            return trope
    
    return None

def work_exists(conn, title, author):
    """Check if a work already exists by title and author"""
    result = conn.execute("""
        SELECT id FROM works 
        WHERE LOWER(TRIM(title)) = ? AND LOWER(TRIM(author)) = ?
    """, (title.lower().strip(), author.lower().strip())).fetchone()
    return result['id'] if result else None

def import_works():
    """Import works from JSON file"""
    if not WORKS_JSON_PATH.exists():
        print(f"Error: Works JSON file not found at {WORKS_JSON_PATH}")
        return False
    
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        return False
    
    print("Loading works from JSON file...")
    with open(WORKS_JSON_PATH, 'r', encoding='utf-8') as f:
        works_data = json.load(f)
    
    print(f"Found {len(works_data)} works to import")
    
    conn = get_db_connection()
    imported_count = 0
    updated_count = 0
    trope_matches = {}
    trope_misses = set()
    
    try:
        for work_data in works_data:
            title = work_data.get('title', '').strip()
            author = work_data.get('author', '').strip()
            description = work_data.get('description', '').strip()
            pub_date = work_data.get('publication_date', '')
            
            # Extract year from publication date
            year = None
            if pub_date:
                try:
                    year = int(pub_date.split('-')[0])
                except:
                    pass
            
            # Determine work type based on categories or default
            categories = work_data.get('category', [])
            work_type = 'Novel'  # Default
            
            # Map categories to work types
            for cat in categories:
                if 'TV' in cat or 'Television' in cat:
                    work_type = 'TV Show'
                    break
                elif 'Film' in cat or 'Movie' in cat:
                    work_type = 'Film'
                    break
                elif 'Comic' in cat or 'Graphic' in cat:
                    work_type = 'Comic'
                    break
                elif 'Game' in cat:
                    work_type = 'Game'
                    break
                elif 'Short Story' in cat:
                    work_type = 'Short Story'
                    break
            
            if not title or not author:
                print(f"Skipping work with missing title or author: {work_data}")
                continue
            
            # Check if work already exists
            existing_work_id = work_exists(conn, title, author)
            current_time = datetime.now().isoformat()
            
            if existing_work_id:
                # Update existing work
                conn.execute("""
                    UPDATE works 
                    SET description = ?, type = ?, year = ?, updated_at = ?
                    WHERE id = ?
                """, (description, work_type, year, current_time, existing_work_id))
                work_id = existing_work_id
                updated_count += 1
                print(f"Updated existing work: {title} by {author}")
            else:
                # Insert new work
                work_id = generate_uuid()
                conn.execute("""
                    INSERT INTO works (id, title, type, year, author, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (work_id, title, work_type, year, author, description, current_time, current_time))
                imported_count += 1
                print(f"Imported new work: {title} by {author}")
            
            # Handle tropes and create examples
            tropes = work_data.get('tropes', [])
            for trope_name in tropes:
                trope_name = trope_name.strip()
                if not trope_name:
                    continue
                
                # Check if we've already looked up this trope
                if trope_name in trope_matches:
                    matched_trope = trope_matches[trope_name]
                elif trope_name in trope_misses:
                    continue
                else:
                    matched_trope = find_matching_trope(conn, trope_name)
                    if matched_trope:
                        trope_matches[trope_name] = matched_trope
                        print(f"  Mapped trope: '{trope_name}' -> '{matched_trope['name']}'")
                    else:
                        trope_misses.add(trope_name)
                        print(f"  No match found for trope: '{trope_name}'")
                        continue
                
                if matched_trope:
                    # Check if example already exists
                    existing = conn.execute("""
                        SELECT id FROM examples 
                        WHERE trope_id = ? AND work_id = ?
                    """, (matched_trope['id'], work_id)).fetchone()
                    
                    if not existing:
                        # Create example relationship
                        example_id = generate_uuid()
                        example_desc = f"Example of '{matched_trope['name']}' trope in {title}"
                        
                        conn.execute("""
                            INSERT INTO examples (id, trope_id, work_id, description, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (example_id, matched_trope['id'], work_id, example_desc, current_time, current_time))
        
        conn.commit()
        
        print(f"\n=== Import Summary ===")
        print(f"New works imported: {imported_count}")
        print(f"Existing works updated: {updated_count}")
        print(f"Trope matches found: {len(trope_matches)}")
        print(f"Trope misses: {len(trope_misses)}")
        
        if trope_matches:
            print(f"\nSuccessful trope mappings:")
            for original, matched in trope_matches.items():
                print(f"  '{original}' -> '{matched['name']}'")
        
        if trope_misses:
            print(f"\nUnmatched tropes (could be added to database):")
            for missed in sorted(trope_misses):
                print(f"  '{missed}'")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"Error importing works: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting works import from JSON...")
    success = import_works()
    if success:
        print("✅ Works import completed successfully!")
    else:
        print("❌ Works import failed!")
        exit(1)
