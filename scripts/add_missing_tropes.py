#!/usr/bin/env python3
"""
Add the unmatched tropes from works.json to the database
"""

import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

# Get project paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "db" / "genre_tropes.db"

def generate_uuid():
    return str(uuid.uuid4())

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def add_missing_tropes():
    """Add the tropes that weren't matched during import"""
    
    # These are the unmatched tropes from the import
    missing_tropes = [
        ('Beauty and the Beast', 'Classic trope where one partner is initially seen as unattractive or beast-like, but love transforms the relationship'),
        ('Broken hero/heroine', 'Character who has been damaged by past experiences but finds healing through love'),
        ('Brooding hero', 'Dark, mysterious, often troubled male protagonist'),
        ('Cat and mouse', 'A relationship dynamic involving pursuit, chase, and power play between characters'),
        ('Celebrity romance', 'Romance involving famous people, dealing with publicity and fame'),
        ('Damsel in distress', 'Female character who needs to be rescued, though modern versions may subvert this'),
        ('Danger brings them together', 'External threats force characters to work together and fall in love'),
        ('Dangerous secrets', 'Hidden information that could threaten the relationship or characters'),
        ('Dark academia', 'Academic setting with dark, mysterious, or gothic elements'),
        ('Emotional healing', 'Characters helping each other overcome trauma or emotional wounds'),
        ('Fantasy world', 'Romance set in a fictional world with magical or fantastical elements'),
        ('Forbidden magic', 'Magic that is outlawed, dangerous, or taboo in the story world'),
        ('Haunted locations', 'Settings with supernatural or ghostly presences'),
        ('Healing together', 'Mutual emotional recovery and growth between romantic partners'),
        ('Hidden pasts', 'Characters with secret histories that affect the romance'),
        ('Hidden secrets', 'Concealed information that drives plot tension'),
        ('High stakes', 'Romance occurring during critical, life-changing situations'),
        ('Magic school', 'Educational institution focused on magical arts'),
        ('Mystery', 'Romance combined with puzzle-solving and unknown elements'),
        ('On the run', 'Characters fleeing from danger while falling in love'),
        ('Paranormal romance', 'Romance involving supernatural creatures or elements'),
        ('Partners in crime (solving)', 'Characters working together to solve mysteries or crimes'),
        ('Past trauma', 'Previous painful experiences that affect current relationships'),
        ('Protective hero', 'Male character who takes on a guardian role'),
        ('Reconnected lovers', 'Former romantic partners who reunite'),
        ('Reluctant allies', 'Characters forced to work together despite initial resistance'),
        ('Secret identity', 'Character hiding their true identity from others'),
        ('Secret societies', 'Hidden organizations with their own agendas'),
        ('Small town mystery', 'Mystery or suspense set in a close-knit community'),
        ('Star-crossed lovers', 'Lovers kept apart by circumstances beyond their control'),
        ('Supernatural creatures', 'Non-human beings like vampires, werewolves, etc.'),
        ('Witty banter', 'Sharp, clever dialogue between romantic interests')
    ]
    
    conn = get_db_connection()
    added_count = 0
    
    try:
        # Get the "Miscellaneous" or "Contemporary Romance" category for new tropes
        category_result = conn.execute("""
            SELECT id FROM categories 
            WHERE name IN ('Contemporary Romance', 'Romance Tropes', 'Miscellaneous')
            LIMIT 1
        """).fetchone()
        
        if not category_result:
            # Create a category for new tropes
            category_id = generate_uuid()
            conn.execute("""
                INSERT INTO categories (id, name)
                VALUES (?, ?)
            """, (category_id, 'Contemporary Romance'))
        else:
            category_id = category_result['id']
        
        for trope_name, description in missing_tropes:
            # Check if trope already exists
            existing = conn.execute("""
                SELECT id FROM tropes 
                WHERE LOWER(TRIM(name)) = ?
            """, (trope_name.lower().strip(),)).fetchone()
            
            if not existing:
                # Add new trope
                trope_id = generate_uuid()
                conn.execute("""
                    INSERT INTO tropes (id, name, description)
                    VALUES (?, ?, ?)
                """, (trope_id, trope_name, description))
                
                # Link to category
                conn.execute("""
                    INSERT INTO trope_categories (trope_id, category_id)
                    VALUES (?, ?)
                """, (trope_id, category_id))
                
                added_count += 1
                print(f"Added trope: {trope_name}")
        
        conn.commit()
        print(f"\n✅ Successfully added {added_count} new tropes to the database!")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding tropes: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("Adding missing tropes to database...")
    add_missing_tropes()
