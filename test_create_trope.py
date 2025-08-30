#!/usr/bin/env python3
"""
Test script for trope creation endpoint
"""

import requests
import json
import time
import sys

BASE_URL = 'http://localhost:8000'

def check_server():
    """Check if server is running"""
    try:
        response = requests.get(f'{BASE_URL}/api/', timeout=2)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def test_valid_trope_creation():
    """Test creating a valid trope"""

def test_create_trope():
    """Test the POST /api/tropes endpoint"""
    try:
        print("🧪 Testing Trope Creation API")
        print("=" * 50)
        
        # Test with valid data
        print("1️⃣ Testing valid trope creation...")
        response = requests.post(
            'http://localhost:8000/api/tropes',
            json=test_trope,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 201:
            data = response.json()
            print("✅ Trope created successfully!")
            print(f"   Name: {data['trope']['name']}")
            print(f"   ID: {data['trope']['id']}")
            print(f"   Categories: {data['trope']['categories']}")
            created_id = data['trope']['id']
        else:
            print(f"❌ Failed to create trope: {response.status_code}")
            print(f"   Response: {response.json()}")
            return False
        
        # Test duplicate name (should fail)
        print("\n2️⃣ Testing duplicate name (should fail)...")
        response = requests.post(
            'http://localhost:8000/api/tropes',
            json=test_trope,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 409:
            print("✅ Duplicate detection working correctly")
            print(f"   Error: {response.json()['error']}")
        else:
            print(f"❌ Unexpected response for duplicate: {response.status_code}")
        
        # Test validation - missing name
        print("\n3️⃣ Testing validation - missing name...")
        invalid_trope = {
            "description": "Test description",
            "category_ids": []
        }
        response = requests.post(
            'http://localhost:8000/api/tropes',
            json=invalid_trope,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 400:
            print("✅ Name validation working correctly")
            print(f"   Error: {response.json()['error']}")
        else:
            print(f"❌ Name validation failed: {response.status_code}")
        
        # Test validation - short description
        print("\n4️⃣ Testing validation - short description...")
        invalid_trope = {
            "name": "Test Trope 2",
            "description": "Short",
            "category_ids": []
        }
        response = requests.post(
            'http://localhost:8000/api/tropes',
            json=invalid_trope,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 400:
            print("✅ Description validation working correctly")
            print(f"   Error: {response.json()['error']}")
        else:
            print(f"❌ Description validation failed: {response.status_code}")
        
        print(f"\n🧹 Cleanup: Attempting to delete test trope (ID: {created_id})")
        # Note: Delete endpoint not implemented yet, so this will show in database
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running at http://localhost:8000")
        print("   Start server with: ./scripts/start_server.sh")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_create_trope()
    sys.exit(0 if success else 1)
