#!/usr/bin/env python3
"""
Quick test for trope creation endpoint
"""
import requests
import json

def test_create_trope():
    """Test creating a new trope"""
    
    # Test data
    trope_data = {
        "name": "Test Magic Wand Trope",
        "description": "A magical item that serves as a focus for spellcasting, often ornate and imbued with mystical properties.",
        "categories": ["Fantasy", "Magic"]
    }
    
    print("🧪 Testing POST /api/tropes")
    print(f"📤 Data: {json.dumps(trope_data, indent=2)}")
    
    try:
        response = requests.post(
            'http://localhost:8000/api/tropes',
            headers={'Content-Type': 'application/json'},
            json=trope_data,
            timeout=5
        )
        
        print(f"\n📥 Response:")
        print(f"   Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            print(f"   Data: {json.dumps(result, indent=2)}")
        else:
            print(f"   Text: {response.text}")
            
        if response.status_code == 201:
            print("✅ SUCCESS: Trope created!")
        elif response.status_code == 400:
            print("⚠️  Validation error or duplicate")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server at localhost:8000")
        print("   Make sure Flask is running: python app.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_create_trope()
