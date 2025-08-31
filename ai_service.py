#!/usr/bin/env python3
"""AI Service for Trope Database"""

import os
import json
import sqlite3
import requests
import uuid
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import openai
from anthropic import Anthropic
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv('.env.local')

@dataclass
class AIConfig:
    """Configuration for AI services"""
    openrouter_api_key: str
    openai_api_key: str
    anthropic_api_key: str
    hardcover_api_bearer: str
    
    @classmethod
    def from_env(cls) -> 'AIConfig':
        return cls(
            openrouter_api_key=os.getenv('openrouter_api_key', ''),
            openai_api_key=os.getenv('open_ai_api_key', ''),
            anthropic_api_key=os.getenv('anthropic_api_key', ''),
            hardcover_api_bearer=os.getenv('graphql_hardcover_api_bearer', '')
        )

class NaturalLanguageToSQL:
    """Convert natural language queries to SQL using AI"""
    
    def __init__(self, config: AIConfig):
        self.config = config
        self.anthropic = Anthropic(api_key=config.anthropic_api_key) if config.anthropic_api_key else None
        self.openai_client = openai.OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None
        
        # OpenRouter client (uses OpenAI-compatible interface)
        self.openrouter_client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=config.openrouter_api_key
        ) if config.openrouter_api_key else None
    
    def natural_to_sql(self, natural_query: str) -> Dict[str, Any]:
        """Convert natural language to SQL query with multiple AI provider fallback"""
        
        system_prompt = """You are an expert SQL generator for a trope database. Convert natural language queries to SQL.

Database Schema:
- tropes table: id, name, description, created_at
- categories table: id, name, description 
- works table: id, title, type, year, author, description, created_at
- examples table: id, trope_id, work_id, description
- trope_categories table: trope_id, category_id

Rules:
1. Use parameterized queries (? placeholders)
2. Return valid SQLite syntax
3. Use LIKE for fuzzy matching with %wildcards%
4. Include reasonable LIMIT
5. For works table: use 'type' column (values: 'Novel', 'Film', 'TV Show', 'Short Story', 'Comic', 'Game', 'Other')
6. For works table: use 'year' column for publication dates

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations.

Format: {"sql": "SELECT...", "params": ["param1"], "explanation": "Brief explanation", "operation": "SELECT"}"""
        
        user_prompt = f'Convert to SQL: "{natural_query}"'
        
        # Try providers in order: Anthropic, OpenAI, OpenRouter
        providers = [
            ("Anthropic", self._try_anthropic),
            ("OpenAI", self._try_openai), 
            ("OpenRouter", self._try_openrouter)
        ]
        
        for provider_name, provider_func in providers:
            try:
                response_text = provider_func(system_prompt, user_prompt)
                if response_text:
                    # Process the response
                    result = self._process_ai_response(response_text, natural_query)
                    if result:
                        return result
            except Exception as e:
                continue
        
        # All providers failed, use fallback
        return self._create_fallback_query(natural_query)
    
    def _try_anthropic(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Try Anthropic Claude"""
        if not self.anthropic:
            return None
            
        response = self.anthropic.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=500,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        return getattr(response.content[0], 'text', str(response.content[0])).strip()
    
    def _try_openai(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Try OpenAI GPT"""
        if not self.openai_client:
            return None
            
        response = self.openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0
        )
        
        content = response.choices[0].message.content
        return content.strip() if content else ""
    
    def _try_openrouter(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Try OpenRouter with a good model"""
        if not self.openrouter_client:
            return None
            
        response = self.openrouter_client.chat.completions.create(
            model="anthropic/claude-3.5-haiku",  # Good balance of speed and accuracy
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0
        )
        
        content = response.choices[0].message.content
        return content.strip() if content else ""
    
    def _process_ai_response(self, response_text: str, natural_query: str) -> Optional[Dict[str, Any]]:
        """Process AI response and extract valid JSON"""
        try:
            # Step 1: Aggressive control character removal
            # Remove ALL control characters except space, tab, newline, carriage return
            response_text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', response_text)
            
            # Step 2: Clean up remaining problematic characters
            response_text = response_text.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
            
            # Step 3: Remove markdown formatting if present
            response_text = re.sub(r'```json\s*', '', response_text)
            response_text = re.sub(r'\s*```', '', response_text)
            
            # Step 4: Repair JSON formatting
            response_text = self.repair_json(response_text)
            
            # Step 5: Find and extract JSON
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
            if json_match:
                json_str = json_match.group()
                
                result = json.loads(json_str)
                if all(key in result for key in ['sql', 'params', 'explanation', 'operation']):
                    # Validate and fix parameter count mismatch
                    result = self._fix_parameter_mismatch(result)
                    result["original_query"] = natural_query
                    return result
            
            return None
            
        except Exception as e:
            print(f"Response processing error: {e}")
            return None
    
    def _fix_parameter_mismatch(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Fix mismatches between SQL placeholders and parameters"""
        sql = result.get("sql", "")
        params = result.get("params", [])
        
        # Count actual placeholders in SQL
        placeholder_count = sql.count("?")
        param_count = len(params)
        
        if placeholder_count != param_count:
            if placeholder_count == 0 and param_count > 0:
                # SQL has no placeholders but params were provided
                # Try to convert literal values to placeholders
                new_sql = sql
                new_params = []
                
                for param in params:
                    # Look for literal values that match the parameter
                    param_pattern = re.escape(str(param).strip('%'))
                    
                    # Replace LIKE 'literal%' with LIKE ?
                    like_pattern = rf"LIKE\s+['\"]%?{param_pattern}%?['\"]"
                    if re.search(like_pattern, new_sql, re.IGNORECASE):
                        new_sql = re.sub(like_pattern, "LIKE ?", new_sql, count=1, flags=re.IGNORECASE)
                        new_params.append(param)
                    
                    # Replace = 'literal' with = ?
                    eq_pattern = rf"=\s+['\"]%?{param_pattern}%?['\"]"
                    if re.search(eq_pattern, new_sql, re.IGNORECASE):
                        new_sql = re.sub(eq_pattern, "= ?", new_sql, count=1, flags=re.IGNORECASE)
                        new_params.append(param)
                
                result["sql"] = new_sql
                result["params"] = new_params[:new_sql.count("?")]  # Limit to actual placeholder count
                
            elif placeholder_count > param_count:
                # More placeholders than params - pad with empty strings
                result["params"] = params + [""] * (placeholder_count - param_count)
                
            elif param_count > placeholder_count:
                # More params than placeholders - truncate params
                result["params"] = params[:placeholder_count]
        
        return result
    
    def repair_json(self, json_string):
        """Repair common JSON issues including control characters."""
        try:
            # Step 1: Remove or escape problematic control characters
            # Remove control characters except allowed ones (tab, newline, carriage return)
            json_string = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', json_string)
            
            # Step 2: Escape remaining control characters in string values
            json_string = json_string.replace('\n', '\\n')
            json_string = json_string.replace('\r', '\\r') 
            json_string = json_string.replace('\t', '\\t')
            
            # Step 3: Fix common JSON formatting issues
            # Add double quotes around unquoted keys
            json_string = re.sub(r'(?<!["\w])([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'"\1":', json_string)
            
            # Replace single quotes with double quotes (but be careful of apostrophes in content)
            json_string = re.sub(r"'([^']*)'(?=\s*[,\]}])", r'"\1"', json_string)
            
            # Step 4: Fix trailing commas
            json_string = re.sub(r',(\s*[}\]])', r'\1', json_string)
            
            # Step 5: Ensure proper string escaping
            # Escape unescaped backslashes (but don't double-escape already escaped ones)
            json_string = re.sub(r'(?<!\\)\\(?!["\\/bfnrt])', r'\\\\', json_string)
            
            # Step 6: Fix missing commas between object/array elements
            json_string = re.sub(r'"\s*"', r'", "', json_string)
            json_string = re.sub(r'}\s*{', r'}, {', json_string)
            json_string = re.sub(r']\s*\[', r'], [', json_string)
            
            return json_string.strip()
            
        except Exception as e:
            print(f"JSON repair error: {e}")
            return json_string
    
    def _create_fallback_query(self, natural_query: str) -> Dict[str, Any]:
        """Create fallback query"""
        query_lower = natural_query.lower()
        
        if "fantasy" in query_lower and ("book" in query_lower or "novel" in query_lower):
            return {
                "sql": "SELECT * FROM works WHERE LOWER(type) = 'novel' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?) LIMIT 20",
                "params": ["%fantasy%", "%fantasy%"],
                "explanation": "Fantasy novels",
                "operation": "SELECT",
                "original_query": natural_query
            }
        elif "fantasy" in query_lower:
            return {
                "sql": "SELECT t.* FROM tropes t LEFT JOIN trope_categories tc ON t.id = tc.trope_id LEFT JOIN categories c ON tc.category_id = c.id WHERE LOWER(t.name) LIKE ? OR LOWER(c.name) LIKE ? LIMIT 20",
                "params": ["%fantasy%", "%fantasy%"],
                "explanation": "Fantasy-related tropes",
                "operation": "SELECT",
                "original_query": natural_query
            }
        elif "last" in query_lower and "years" in query_lower:
            return {
                "sql": "SELECT * FROM works WHERE year >= ? ORDER BY year DESC LIMIT 20",
                "params": [2020],  # Last 5 years from 2025
                "explanation": "Recent works from last 5 years",
                "operation": "SELECT",
                "original_query": natural_query
            }
        
        return {
            "sql": "SELECT * FROM tropes WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? LIMIT 10",
            "params": [f"%{query_lower}%", f"%{query_lower}%"],
            "explanation": f"Search for: {natural_query}",
            "operation": "SELECT",
            "original_query": natural_query
        }

class HardcoverAPI:
    """Hardcover API client for book search and data"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.hardcover.app/v1/graphql"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def search_books(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for books using GraphQL API"""
        if not self.api_key:
            # Return mock data when API key is not available
            return self._get_mock_books(query, limit)
        
        graphql_query = """
        query SearchBooks($query: String!, $limit: Int!) {
          books(where: { title: { _ilike: $query } }, limit: $limit) {
            id
            title
            description
            publication_year
            cover_image_url
            authors {
              name
            }
            genres {
              name
            }
          }
        }
        """
        
        variables = {
            "query": f"%{query}%",
            "limit": limit
        }
        
        try:
            response = requests.post(
                self.base_url,
                json={"query": graphql_query, "variables": variables},
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                books = data.get("data", {}).get("books", [])
                
                # Format books for consistent API response
                formatted_books = []
                for book in books:
                    formatted_books.append({
                        "id": book.get("id"),
                        "title": book.get("title", ""),
                        "description": book.get("description", ""),
                        "year": book.get("publication_year"),
                        "cover_image": book.get("cover_image_url"),
                        "authors": book.get("authors", []),
                        "genres": book.get("genres", [])
                    })
                
                return formatted_books
            else:
                # API request failed, return mock data
                print(f"Hardcover API request failed: {response.status_code}")
                return self._get_mock_books(query, limit)
                
        except requests.RequestException as e:
            print(f"Hardcover API network error: {str(e)}")
            return self._get_mock_books(query, limit)
        except Exception as e:
            print(f"Hardcover API error: {str(e)}")
            return self._get_mock_books(query, limit)
    
    def _get_mock_books(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Return mock book data with rich descriptions for testing when API is unavailable"""
        query_lower = query.lower()
        
        mock_books = [
            {
                "id": "mock-hp-1",
                "title": "Harry Potter and the Philosopher's Stone",
                "description": "A young orphaned wizard named Harry Potter discovers his magical heritage on his eleventh birthday when he receives a letter to attend Hogwarts School of Witchcraft and Wizardry. Raised by cruel relatives who kept his true identity secret, Harry learns he is famous in the wizarding world for surviving the killing curse cast by the dark wizard Voldemort, who murdered his parents. At Hogwarts, Harry befriends Ron Weasley and Hermione Granger, discovers his natural talent for Quidditch, and faces his first real challenge against evil when he must protect the Philosopher's Stone from falling into the wrong hands. This coming-of-age story features themes of friendship, the power of love over death, good versus evil, and a hero's journey from obscurity to destiny. Harry must overcome self-doubt, face dangerous magical creatures, solve puzzles, and ultimately confront a manifestation of the dark wizard who killed his parents.",
                "year": 1997,
                "cover_image": None,
                "authors": [{"name": "J.K. Rowling"}],
                "genres": [{"name": "Fantasy"}, {"name": "Young Adult"}, {"name": "Coming of Age"}]
            },
            {
                "id": "mock-hp-2", 
                "title": "Harry Potter and the Chamber of Secrets",
                "description": "In his second year at Hogwarts, Harry Potter faces new dangers when the legendary Chamber of Secrets is opened, unleashing a monster that petrifies students. Harry discovers he can speak to serpents, leading some to suspect he is the heir of Salazar Slytherin and responsible for the attacks. As fear grips the school and students are mysteriously petrified, Harry must uncover ancient secrets, face prejudice about his unusual abilities, and venture into the depths of the chamber to save his friend's sister and the school itself. The story explores themes of prejudice, the power of memory and the past to influence the present, and the danger of judging others by their abilities rather than their choices. Harry encounters Tom Riddle's memory preserved in a diary, learning more about Voldemort's past while battling a deadly basilisk.",
                "year": 1998,
                "cover_image": None,
                "authors": [{"name": "J.K. Rowling"}],
                "genres": [{"name": "Fantasy"}, {"name": "Young Adult"}, {"name": "Mystery"}]
            },
            {
                "id": "mock-pride",
                "title": "Pride and Prejudice",
                "description": "Set in Regency England, this classic romance follows Elizabeth Bennet, a witty and independent young woman from a middle-class family, and her tumultuous relationship with the proud, wealthy aristocrat Mr. Fitzwilliam Darcy. Initially repelled by his apparent arrogance and class prejudice, Elizabeth must overcome her own preconceptions when she learns of Darcy's hidden kindness and moral character. The story explores the enemies-to-lovers dynamic as misunderstandings, social expectations, and personal pride create barriers between them. Themes include the importance of looking beyond first impressions, the restrictions placed on women by society, the tension between love and practical considerations in marriage, and the gradual character development of both protagonists as they learn to see past their initial prejudices.",
                "year": 1813,
                "cover_image": None,
                "authors": [{"name": "Jane Austen"}],
                "genres": [{"name": "Romance"}, {"name": "Classic"}, {"name": "Regency"}]
            },
            {
                "id": "mock-hobbit",
                "title": "The Hobbit",
                "description": "Bilbo Baggins, a comfortable and unadventurous hobbit, is swept into an epic quest when the wizard Gandalf and thirteen dwarves arrive at his door. Reluctantly joining their mission to reclaim the Lonely Mountain and its treasure from the fearsome dragon Smaug, Bilbo discovers courage he never knew he possessed. His hero's journey takes him through dangerous forests filled with giant spiders, encounters with elves, capture by goblins, and a fateful meeting with the creature Gollum where he acquires a mysterious magic ring. The story follows the classic reluctant hero archetype as Bilbo transforms from a timid homebody into a clever burglar and brave adventurer. Themes include the call to adventure, personal growth through trials, the corruption of greed, and the importance of mercy and compassion even toward enemies.",
                "year": 1937,
                "cover_image": None,
                "authors": [{"name": "J.R.R. Tolkien"}],
                "genres": [{"name": "Fantasy"}, {"name": "Adventure"}, {"name": "Classic"}]
            },
            {
                "id": "mock-gatsby",
                "title": "The Great Gatsby",
                "description": "Set in the Jazz Age of the 1920s, this tragic tale follows the mysterious millionaire Jay Gatsby and his obsessive pursuit of his lost love, Daisy Buchanan. Narrated by Nick Carraway, Daisy's cousin, the story reveals how Gatsby has built his entire wealthy facade and criminal connections in hopes of winning back the woman he loved and lost five years earlier. Gatsby's idealization of Daisy and his belief that he can repeat the past ultimately leads to his downfall. The novel explores the corruption of the American Dream, the hollowness of wealth and status, the impossibility of recapturing the past, and the moral decay beneath the glittering surface of the Roaring Twenties. Themes of unrequited love, social class barriers, and the tragic hero's fatal flaw permeate this critique of American society.",
                "year": 1925,
                "cover_image": None,
                "authors": [{"name": "F. Scott Fitzgerald"}],
                "genres": [{"name": "Literary Fiction"}, {"name": "Classic"}, {"name": "Tragedy"}]
            },
            {
                "id": "mock-wuthering",
                "title": "Wuthering Heights",
                "description": "A dark and passionate tale of obsessive love and revenge set on the Yorkshire moors. Heathcliff, an orphan taken in by the Earnshaw family, develops an intense bond with Catherine Earnshaw, but their love is thwarted by social class differences and Catherine's decision to marry the refined Edgar Linton instead. Consumed by jealousy and a desire for revenge, Heathcliff systematically destroys both the Earnshaw and Linton families across two generations. This Gothic romance explores themes of destructive passion, the cyclical nature of abuse and revenge, class conflict, and the supernatural. The story features elements of enemies-to-lovers turned tragic, forbidden love, social climbing, arranged marriage, and generational trauma, making it rich with tropes that influenced countless later works.",
                "year": 1847,
                "cover_image": None,
                "authors": [{"name": "Emily Brontë"}],
                "genres": [{"name": "Gothic"}, {"name": "Romance"}, {"name": "Classic"}]
            }
        ]
        
        # Filter books based on query
        if query_lower:
            filtered_books = []
            for book in mock_books:
                if (query_lower in book["title"].lower() or 
                    query_lower in book["description"].lower() or
                    any(query_lower in author["name"].lower() for author in book["authors"]) or
                    any(query_lower in genre["name"].lower() for genre in book["genres"])):
                    filtered_books.append(book)
            return filtered_books[:limit]
        
        return mock_books[:limit]

class AIDatabase:
    """Main AI-powered database interface"""
    
    def __init__(self, db_path: str = "db/genre_tropes.db"):
        self.db_path = db_path
        self.config = AIConfig.from_env()
        self.nl_to_sql = NaturalLanguageToSQL(self.config)
        self.hardcover = HardcoverAPI(self.config.hardcover_api_bearer)
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def natural_query(self, query: str) -> Dict[str, Any]:
        """Execute natural language database query"""
        
        try:
            # Convert to SQL using AI
            sql_result = self.nl_to_sql.natural_to_sql(query)
            
            # Execute the SQL
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute(sql_result["sql"], sql_result["params"])
            
            if sql_result["sql"].strip().upper().startswith("SELECT"):
                rows = cursor.fetchall()
                results = [dict(row) for row in rows]
            else:
                conn.commit()
                results = {"rows_affected": cursor.rowcount}
            
            conn.close()
            
            return {
                "success": True,
                "results": results,
                "sql": sql_result["sql"],
                "explanation": sql_result["explanation"],
                "count": len(results) if isinstance(results, list) else 1
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate SQL: {str(e)}"
            }
    
    def enrich_from_hardcover(self, title: str) -> Dict[str, Any]:
        """Import a book from Hardcover and extract tropes using AI"""
        try:
            # Search for the book
            books = self.hardcover.search_books(title, limit=1)
            
            if not books:
                return {
                    "success": False,
                    "error": f"No books found for '{title}'"
                }
            
            book = books[0]
            
            # Check if book already exists in database
            conn = self.get_db_connection()
            existing = conn.execute(
                "SELECT id FROM works WHERE LOWER(title) = LOWER(?)",
                (book["title"],)
            ).fetchone()
            
            if existing:
                conn.close()
                return {
                    "success": False,
                    "error": f"Book '{book['title']}' already exists in database"
                }
            
            # Add the book to works table
            work_id = str(uuid.uuid4())
            authors = ", ".join([author["name"] for author in book.get("authors", [])])
            
            conn.execute("""
                INSERT INTO works (id, title, type, year, author, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (
                work_id,
                book["title"],
                "Novel",  # Default type
                book.get("year"),
                authors or None,
                book.get("description")
            ))
            
            # Use AI to extract tropes from the book description
            tropes_added = []
            if book.get("description"):
                trope_result = self._extract_tropes_from_description(book["description"], work_id)
                tropes_added = trope_result.get("tropes", [])
            
            conn.commit()
            conn.close()
            
            return {
                "success": True,
                "book": book,
                "work_id": work_id,
                "tropes_added": tropes_added,
                "message": f"Successfully imported '{book['title']}'",
                "count": len(tropes_added)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Import failed: {str(e)}"
            }
    
    def _extract_tropes_from_description(self, description: str, work_id: str) -> Dict[str, Any]:
        """Extract tropes from book description using AI and enhanced keyword matching"""
        try:
            # Get existing tropes from database for matching
            conn = self.get_db_connection()
            existing_tropes = conn.execute("""
                SELECT t.name, t.description, c.name as category 
                FROM tropes t 
                LEFT JOIN trope_categories tc ON t.id = tc.trope_id 
                LEFT JOIN categories c ON tc.category_id = c.id 
                LIMIT 100
            """).fetchall()
            
            identified_tropes = []
            
            # Enhanced AI-based trope identification
            if existing_tropes:
                # Create a concise trope list for AI prompt
                trope_list = []
                trope_dict = {}
                for trope in existing_tropes:
                    category = trope["category"] or "General"
                    trope_name = trope["name"]
                    trope_desc = trope["description"][:100] if trope["description"] else ""
                    trope_list.append(f"- {trope_name}")
                    trope_dict[trope_name] = trope_desc

                system_prompt = f"""You are an expert in literary tropes. Analyze the book description and identify which tropes from this list apply:

{chr(10).join(trope_list[:30])}

Return ONLY the exact trope names that clearly apply, one per line. Be selective."""
                
                # Try AI providers for better trope identification
                try:
                    if self.nl_to_sql.anthropic:
                        response = self.nl_to_sql.anthropic.messages.create(
                            model="claude-3-5-haiku-20241022",
                            max_tokens=300,
                            temperature=0.1,
                            system=system_prompt,
                            messages=[{"role": "user", "content": f"Book description: {description}"}]
                        )
                        ai_response = getattr(response.content[0], 'text', str(response.content[0])).strip()
                        
                        # Parse AI response - expect one trope name per line
                        potential_tropes = [line.strip() for line in ai_response.split('\n') if line.strip()]
                        
                        # Validate against our database
                        for potential_trope in potential_tropes[:8]:  # Allow up to 8 tropes
                            trope_match = conn.execute(
                                "SELECT name FROM tropes WHERE LOWER(name) = LOWER(?)", 
                                (potential_trope,)
                            ).fetchone()
                            if trope_match and trope_match["name"] not in identified_tropes:
                                identified_tropes.append(trope_match["name"])
                        
                        print(f"AI identified tropes: {identified_tropes}")
                        
                except Exception as e:
                    print(f"AI trope extraction failed: {e}")
            
            # Enhanced keyword matching if AI fails or as supplement
            if len(identified_tropes) < 3:
                description_lower = description.lower()
                
                # Comprehensive keyword patterns for trope matching
                trope_patterns = {
                    "Secret": ["secret", "hidden", "concealed", "mystery", "chamber of secrets", "unknown identity"],
                    "Secret Baby": ["secret baby", "hidden child", "unknown child", "secret son", "secret daughter"],
                    "Secret/Lost Heir": ["heir", "inheritance", "throne", "kingdom", "royal", "prince", "princess", "legacy"],
                    "Enemies to Lovers": ["enemies", "hate", "rival", "antagonist", "prejudice", "initial dislike", "pride and prejudice"],
                    "Witch/Magic User": ["witch", "wizard", "magic", "magical", "spell", "enchant", "sorcery", "witchcraft", "wizardry", "hogwarts"],
                    "Complete Magic Orb": ["orb", "crystal", "magical object", "artifact", "stone", "philosopher's stone", "magic stone"],
                    "Chosen One": ["chosen", "destiny", "prophesied", "special", "unique power", "the one", "savior", "boy who lived"],
                    "Coming of Age": ["coming of age", "growing up", "maturity", "school", "young adult", "teenager", "adolescent"],
                    "Mentor": ["mentor", "teacher", "guide", "wisdom", "teaches", "guidance", "gandalf", "dumbledore"],
                    "Dark Lord": ["dark lord", "evil wizard", "villain", "dark magic", "voldemort", "sauron"],
                    "Orphan": ["orphan", "orphaned", "parents died", "no parents", "raised by", "relatives"],
                    "Hero's Journey": ["journey", "quest", "adventure", "call to adventure", "reluctant hero", "unexpected journey"],
                    "Forbidden Love": ["forbidden", "can't be together", "social class", "different worlds", "impossible love"],
                    "Unrequited Love": ["unrequited", "one-sided", "obsessive", "pursuit", "great gatsby"],
                    "Tragic Hero": ["tragic", "downfall", "fatal flaw", "hubris", "destruction", "tragedy"],
                    "Gothic Romance": ["gothic", "dark", "brooding", "mysterious", "atmospheric", "wuthering heights"],
                    "Revenge": ["revenge", "vengeance", "payback", "retribution", "getting back", "systematically destroys"],
                    "Class Differences": ["class", "social status", "wealth", "poor", "rich", "aristocrat", "regency"],
                    "American Dream": ["american dream", "self-made", "rags to riches", "success", "jazz age"],
                    "Reluctant Hero": ["reluctant", "unadventurous", "comfortable", "swept into", "bilbo"],
                    "Dragon": ["dragon", "smaug", "monster", "beast", "creature"],
                    "Prejudice": ["prejudice", "preconceptions", "first impressions", "misjudged"],
                    "Memory/Past": ["memory", "past", "diary", "preserved", "influence", "history"],
                    "Transformation": ["transform", "change", "growth", "becomes", "learns", "discovers"],
                    "Good vs Evil": ["good", "evil", "light", "dark", "battle", "fight", "against"],
                    "Friendship": ["friend", "friendship", "loyal", "companion", "together"],
                    "Sacrifice": ["sacrifice", "save", "protect", "give up", "for others"]
                }
                
                # Match patterns to existing tropes in database
                for trope_name in [t["name"] for t in existing_tropes]:
                    if trope_name in identified_tropes:
                        continue  # Already found
                    
                    # Check if trope name appears directly
                    if trope_name.lower() in description_lower:
                        identified_tropes.append(trope_name)
                        continue
                    
                    # Check pattern matching
                    patterns = trope_patterns.get(trope_name, [])
                    for pattern in patterns:
                        if pattern in description_lower:
                            identified_tropes.append(trope_name)
                            print(f"Keyword match: '{pattern}' -> '{trope_name}'")
                            break
                    
                    # Stop if we have enough tropes
                    if len(identified_tropes) >= 8:
                        break
            
            print(f"Final tropes identified: {identified_tropes} (count: {len(identified_tropes)})")
            
            # Add examples for identified tropes
            for trope_name in identified_tropes:
                trope = conn.execute("SELECT id FROM tropes WHERE name = ?", (trope_name,)).fetchone()
                if trope:
                    example_id = str(uuid.uuid4())
                    conn.execute("""
                        INSERT INTO examples (id, trope_id, work_id, description, created_at, updated_at)
                        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                    """, (
                        example_id,
                        trope["id"],
                        work_id,
                        f"Identified from book description: {description[:200]}..."
                    ))
            
            conn.commit()
            conn.close()
            
            return {
                "tropes": [{"name": name} for name in identified_tropes],
                "count": len(identified_tropes)
            }
            
        except Exception as e:
            print(f"Trope extraction error: {str(e)}")
            return {"tropes": [], "count": 0, "error": str(e)}
