import csv
import sqlite3
import uuid

# Function to generate a UUID
def generate_uuid():
    return str(uuid.uuid4())

# Connect to SQLite database (or create it if it doesn't exist)
conn = sqlite3.connect("genre_tropes.db")
cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS tropes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS trope_categories (
    trope_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    FOREIGN KEY (trope_id) REFERENCES tropes (id),
    FOREIGN KEY (category_id) REFERENCES categories (id),
    PRIMARY KEY (trope_id, category_id)
);
""")

# Read CSV file
with open("data/genre_tropes_data.csv", "r") as file:
    # Normalize CSV headers to ensure compatibility
    reader = csv.DictReader(file)

    # Validate and normalize CSV headers
    if reader.fieldnames:
        reader.fieldnames = [header.strip().lstrip('\ufeff').lower() for header in reader.fieldnames]  # Normalize headers and remove BOM
        print("Normalized fieldnames:", reader.fieldnames)
    else:
        raise ValueError("The CSV file is empty or improperly formatted.")

    # Dictionaries to store unique categories and tropes
    categories = {}
    tropes = {}

    # Updated keys to match normalized headers
    for row in reader:
        trope_name = row["trope_name"].strip()
        trope_category = row["trope_category"].strip()
        trope_description = row["trope_description"].strip()

        # Add category if not already added
        if trope_category not in categories:
            category_id = generate_uuid()
            categories[trope_category] = category_id
            cursor.execute("INSERT INTO categories (id, name) VALUES (?, ?)", (category_id, trope_category))

        # Add trope if not already added
        if trope_name not in tropes:
            trope_id = generate_uuid()
            tropes[trope_name] = {
                "id": trope_id,
                "description": trope_description
            }
            cursor.execute("INSERT INTO tropes (id, name, description) VALUES (?, ?, ?)", (trope_id, trope_name, trope_description))

        # Link trope to category
        cursor.execute("INSERT OR IGNORE INTO trope_categories (trope_id, category_id) VALUES (?, ?)",
                       (tropes[trope_name]["id"], categories[trope_category]))

# Commit changes and close connection
conn.commit()
conn.close()

print("Database created and populated successfully.")
