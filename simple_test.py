#!/usr/bin/env python3
"""
Simple test script for trope creation endpoint
"""

import requests
import json

BASE_URL = 'http://localhost:8000'

def test_endpoint():
    """Test the trope creation endpoint"""
    
    # Test data
    test_trope = {
        'name': 'Test Magic System',
        'description': 'A test trope about magic systems in fantasy literature.',
        'categories': ['Fantasy', 'Adventure']
    }
    
    print("🧪 Testing Trope Creation Endpoint")
    print("=" * 50)
    print(f"📤 Sending POST request to {BASE_URL}/api/tropes")
    print(f"📋 Data: {json.dumps(test_trope, indent=2)}")
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/tropes',
            headers={'Content-Type': 'application/json'},
            json=test_trope,
            timeout=10
        )
        
        print(f"\n📥 Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        try:
            json_response = response.json()
            print(f"   Body: {json.dumps(json_response, indent=2)}")
            
            if response.status_code == 201:
                print("✅ SUCCESS: Trope created successfully!")
            else:
                print("⚠️  Unexpected response code")
                
        except json.JSONDecodeError:
            print(f"   Body (raw): {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_duplicate():
    """Test duplicate trope creation"""
    
    print("\n🔄 Testing duplicate detection...")
    
    duplicate_trope = {
        'name': 'Test Magic System',  # Same as above
        'description': 'Another magic system description',
        'categories': ['Fantasy']
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/api/tropes',
            headers={'Content-Type': 'application/json'},
            json=duplicate_trope,
            timeout=10
        )
        
        print(f"   Status Code: {response.status_code}")
        try:
            json_response = response.json()
            print(f"   Response: {json.dumps(json_response, indent=2)}")
            
            if response.status_code == 400:
                print("✅ SUCCESS: Duplicate properly rejected!")
            else:
                print("⚠️  Expected 400 status code for duplicate")
                
        except json.JSONDecodeError:
            print(f"   Body (raw): {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    # Check server first
    try:
        check_response = requests.get(f'{BASE_URL}/api/', timeout=2)
        if check_response.status_code != 200:
            print("❌ Server not responding properly")
            exit(1)
    except:
        print("❌ Server not running on port 8000")
        exit(1)
    
    # Run tests
    test_endpoint()
    test_duplicate()
    
    print("\n🎯 Test completed!")
