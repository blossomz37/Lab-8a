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
        self.anthropic = Anthropic(api_key=config.anthropic_api_key)
    
    def natural_to_sql(self, natural_query: str) -> Dict[str, Any]:
        """Convert natural language to SQL query"""
        
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
        
        try:
            response = self.anthropic.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=500,
                temperature=0,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            # Extract text response safely
            response_text = getattr(response.content[0], 'text', str(response.content[0])).strip()
            
            # Remove control characters except newlines and tabs
            import re
            response_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', response_text)
            
            # Find JSON in response
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
            if json_match:
                json_str = json_match.group()
                result = json.loads(json_str)
                if all(key in result for key in ['sql', 'params', 'explanation', 'operation']):
                    result["original_query"] = natural_query
                    return result
            
            # Fallback
            return self._create_fallback_query(natural_query)
            
        except Exception as e:
            print(f"AI Error: {e}")
            return self._create_fallback_query(natural_query)
    
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

class AIDatabase:
    """Main AI-powered database interface"""
    
    def __init__(self, db_path: str = "db/genre_tropes.db"):
        self.db_path = db_path
        self.config = AIConfig.from_env()
        self.nl_to_sql = NaturalLanguageToSQL(self.config)
    
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
