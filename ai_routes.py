#!/usr/bin/env python3
"""
AI-powered API routes for the Trope Database
Adds natural language querying and Hardcover integration
"""

from flask import Blueprint, request, jsonify
from ai_service import AIDatabase
import json

# Create AI blueprint
ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Initialize AI database service
ai_db = AIDatabase()

@ai_bp.route('/query', methods=['POST'])
def natural_language_query():
    """
    Natural language database query endpoint
    
    POST /api/ai/query
    {
        "query": "Find all romance tropes created after 2020"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'query' field in request"
            }), 400
        
        query = data['query'].strip()
        
        if not query:
            return jsonify({
                "success": False,
                "error": "Query cannot be empty"
            }), 400
        
        # Execute natural language query
        result = ai_db.natural_query(query)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

@ai_bp.route('/books/search', methods=['GET'])
def search_hardcover_books():
    """
    Search Hardcover API for books
    
    GET /api/ai/books/search?q=pride+prejudice&limit=5
    """
    try:
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50 results
        
        if not query:
            return jsonify({
                "success": False,
                "error": "Missing search query parameter 'q'"
            }), 400
        
        # Search Hardcover API
        books = ai_db.hardcover.search_books(query, limit)
        
        return jsonify({
            "success": True,
            "query": query,
            "count": len(books),
            "books": books
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Search error: {str(e)}"
        }), 500

@ai_bp.route('/books/import', methods=['POST'])
def import_book_with_tropes():
    """
    Import a book from Hardcover and extract tropes using AI
    
    POST /api/ai/books/import
    {
        "title": "Pride and Prejudice",
        "extract_tropes": true
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'title' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'title' field in request"
            }), 400
        
        title = data['title'].strip()
        
        if not title:
            return jsonify({
                "success": False,
                "error": "Title cannot be empty"
            }), 400
        
        # Import book and extract tropes
        result = ai_db.enrich_from_hardcover(title)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Import error: {str(e)}"
        }), 500

@ai_bp.route('/tropes/extract', methods=['POST'])
def extract_tropes_from_text():
    """
    Extract tropes from text description using AI
    
    POST /api/ai/tropes/extract
    {
        "text": "A story about two rivals who gradually fall in love...",
        "title": "Book Title (optional)"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'text' field in request"
            }), 400
        
        text = data['text'].strip()
        title = data.get('title', '').strip()
        
        if not text:
            return jsonify({
                "success": False,
                "error": "Text cannot be empty"
            }), 400
        
        # Extract tropes using AI
        tropes = ai_db.trope_ai.extract_tropes_from_description(text, title)
        
        return jsonify({
            "success": True,
            "text_length": len(text),
            "tropes_found": len(tropes),
            "tropes": tropes
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Extraction error: {str(e)}"
        }), 500

@ai_bp.route('/help', methods=['GET'])
def ai_help():
    """
    Get help and examples for AI endpoints
    
    GET /api/ai/help
    """
    
    examples = {
        "natural_language_queries": [
            "Find all romance tropes",
            "Show me fantasy books from 2023",
            "List tropes used in works by Jane Austen", 
            "Find books with 'enemies to lovers' trope",
            "Show me the most popular categories",
            "Add a new trope called 'found family' in the fantasy category"
        ],
        "book_searches": [
            "Pride and Prejudice",
            "Harry Potter",
            "The Hobbit",
            "Romeo and Juliet"
        ],
        "endpoints": {
            "/api/ai/query": {
                "method": "POST",
                "description": "Execute natural language database queries",
                "example": {
                    "query": "Find all romance tropes"
                }
            },
            "/api/ai/books/search": {
                "method": "GET", 
                "description": "Search Hardcover API for books",
                "example": "?q=pride+prejudice&limit=5"
            },
            "/api/ai/books/import": {
                "method": "POST",
                "description": "Import book and extract tropes using AI",
                "example": {
                    "title": "Pride and Prejudice"
                }
            },
            "/api/ai/tropes/extract": {
                "method": "POST",
                "description": "Extract tropes from text using AI",
                "example": {
                    "text": "A story about rivals who fall in love",
                    "title": "Example Book"
                }
            }
        }
    }
    
    return jsonify({
        "ai_features": "Natural language database queries + Hardcover book integration",
        "available_models": ["Claude (Anthropic)", "GPT (OpenAI)", "Multiple (OpenRouter)"],
        "examples": examples
    }), 200

@ai_bp.route('/status', methods=['GET'])
def ai_status():
    """
    Check AI service configuration and status
    
    GET /api/ai/status
    """
    try:
        config = ai_db.config
        
        status = {
            "ai_service": "ready",
            "apis_configured": {
                "anthropic": bool(config.anthropic_api_key),
                "openai": bool(config.openai_api_key),
                "openrouter": bool(config.openrouter_api_key),
                "hardcover": bool(config.hardcover_api_bearer)
            },
            "features": {
                "natural_language_queries": True,
                "hardcover_integration": bool(config.hardcover_api_bearer),
                "trope_extraction": True,
                "sql_generation": True
            }
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({
            "ai_service": "error",
            "error": str(e)
        }), 500

# Error handlers for AI blueprint
@ai_bp.errorhandler(404)
def ai_not_found(error):
    return jsonify({
        "success": False,
        "error": "AI endpoint not found",
        "available_endpoints": [
            "/api/ai/query",
            "/api/ai/books/search", 
            "/api/ai/books/import",
            "/api/ai/tropes/extract",
            "/api/ai/help",
            "/api/ai/status"
        ]
    }), 404

@ai_bp.errorhandler(500)
def ai_server_error(error):
    return jsonify({
        "success": False,
        "error": "AI service error",
        "message": "Check AI API keys and configuration"
    }), 500