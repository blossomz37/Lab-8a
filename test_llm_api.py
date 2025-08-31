#!/usr/bin/env python3
"""
Comprehensive API test script to verify all AI service connections
Tests: Anthropic Claude, OpenAI, OpenRouter, and Hardcover APIs
"""

import os
import requests
from anthropic import Anthropic
import openai
import json
from dotenv import load_dotenv

def test_anthropic_api():
    """Test direct Anthropic API call"""
    
    print("🧪 Testing Anthropic Claude API...")
    
    # Load environment variables from .env.local file (same as main app)
    load_dotenv('.env.local')
    
    api_key = os.getenv('anthropic_api_key')
    if not api_key:
        print("❌ anthropic_api_key not found in environment")
        return False
    
    print(f"✅ Found API key: {api_key[:15]}...")
    
    try:
        # Initialize client
        client = Anthropic(api_key=api_key)
        print("✅ Anthropic client initialized")
        
        # Simple test message
        test_query = "Convert this to JSON: Hello World"
        
        print(f"🔄 Sending test query: {test_query}")
        
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            messages=[{
                "role": "user", 
                "content": test_query
            }]
        )
        
        print("✅ Got response from Anthropic")
        
        if response.content:
            content_item = response.content[0]
            
            # Get text safely using getattr
            response_text = getattr(content_item, 'text', str(content_item))
            print(f"✅ Response text: {response_text}")
            
            # Check for control characters
            import re
            control_chars = re.findall(r'[\x00-\x1f\x7f-\x9f]', response_text)
            if control_chars:
                print(f"⚠️  Found control characters: {control_chars}")
            else:
                print("✅ No control characters found")
            
            return True
        else:
            print("❌ No content in response")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_openai_api():
    """Test OpenAI API call"""
    
    print("\n🧪 Testing OpenAI API...")
    
    api_key = os.getenv('open_ai_api_key')
    if not api_key:
        print("❌ open_ai_api_key not found in environment")
        return False
    
    print(f"✅ Found API key: {api_key[:15]}...")
    
    try:
        # Initialize client
        client = openai.OpenAI(api_key=api_key)
        print("✅ OpenAI client initialized")
        
        # Simple test message
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{
                "role": "user",
                "content": "Say 'OpenAI API test successful' in JSON format"
            }],
            max_tokens=50
        )
        
        print("✅ Got response from OpenAI")
        
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            print(f"✅ Response: {content}")
            return True
        else:
            print("❌ No choices in response")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_openrouter_api():
    """Test OpenRouter API call"""
    
    print("\n🧪 Testing OpenRouter API...")
    
    api_key = os.getenv('openrouter_api_key')
    if not api_key:
        print("❌ openrouter_api_key not found in environment")
        return False
    
    print(f"✅ Found API key: {api_key[:15]}...")
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Trope Database Test"
        }
        
        data = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {
                    "role": "user",
                    "content": "Say 'OpenRouter API test successful'"
                }
            ],
            "max_tokens": 50
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                print(f"✅ Response: {content}")
                return True
            else:
                print(f"❌ No choices in response: {result}")
                return False
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_natural_language_to_sql():
    """Test the exact same natural language to SQL conversion as the app"""
    
    print("\n🧪 Testing Natural Language to SQL (Exact App Logic)...")
    
    try:
        # Import our AI service
        from ai_service import AIDatabase
        
        # Create AI database instance
        ai_db = AIDatabase()
        print("✅ AI Database initialized")
        
        # Test the exact same query that's failing
        test_query = "show me fantasy books from the last 5 years"
        print(f"🔄 Testing query: {test_query}")
        
        result = ai_db.natural_query(test_query)
        print(f"✅ Query result: {result}")
        
        if result.get("success"):
            print("✅ Natural language query successful!")
            return True
        else:
            print(f"❌ Natural language query failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error in natural language test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_ai_sql_conversion_only():
    """Test just the AI to SQL conversion part"""
    
    print("\n🧪 Testing AI SQL Conversion Only...")
    
    try:
        from ai_service import NaturalLanguageToSQL, AIConfig
        
        # Initialize just the SQL converter
        config = AIConfig.from_env()
        nl_to_sql = NaturalLanguageToSQL(config)
        print("✅ NaturalLanguageToSQL initialized")
        
        # Test the conversion
        test_query = "show me fantasy books from the last 5 years"
        print(f"🔄 Converting query: {test_query}")
        
        result = nl_to_sql.natural_to_sql(test_query)
        print(f"✅ SQL conversion result: {result}")
        
        # Check if result has proper structure
        if all(key in result for key in ['sql', 'params', 'explanation', 'operation']):
            print("✅ SQL conversion has proper structure!")
            return True
        else:
            print(f"❌ Missing required fields in result: {list(result.keys())}")
            return False
            
    except Exception as e:
        print(f"❌ Error in SQL conversion test: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all API tests"""
    
    print("🚀 Comprehensive AI Services API Test")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv('.env.local')
    
    # Debug: Show which API keys are available
    print("🔍 Available API keys:")
    api_keys = [
        'anthropic_api_key',
        'open_ai_api_key', 
        'openrouter_api_key',
        'graphql_hardcover_api_bearer'
    ]
    
    for key in api_keys:
        value = os.getenv(key)
        if value:
            print(f"   ✅ {key}: {value[:15]}...")
        else:
            print(f"   ❌ {key}: Not set")
    
    print("\n" + "=" * 50)
    
    # Run all tests
    results = {}
    
    results['anthropic'] = test_anthropic_api()
    results['openai'] = test_openai_api()
    results['openrouter'] = test_openrouter_api()
    results['ai_sql_conversion'] = test_ai_sql_conversion_only()
    results['natural_language_query'] = test_natural_language_to_sql()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    
    for service, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {service.capitalize()}: {status}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    print(f"\n🎯 Overall: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("🎉 All API services are working correctly!")
        return True
    else:
        print("⚠️  Some API services need attention")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
