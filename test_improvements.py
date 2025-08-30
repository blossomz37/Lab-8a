#!/usr/bin/env python3
"""
Test script to verify the category formatting and search improvements
"""
import requests
import time

def test_improvements():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Category Formatting and Enhanced Search")
    print("=" * 50)
    
    try:
        # Test 1: Formatted categories
        print("\n1️⃣ Testing Category Formatting:")
        response = requests.get(f"{base_url}/api/categories")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Found {data['count']} categories")
            
            examples = [
                "forced_situation", "age_gap", "class_difference", 
                "lgbtq+", "character_type"
            ]
            
            for cat in data['categories'][:5]:
                original = cat['name']
                formatted = cat.get('display_name', 'No display name')
                print(f"   📝 \"{original}\" → \"{formatted}\"")
        else:
            print(f"   ❌ Categories API failed: {response.status_code}")
            
        # Test 2: Search functionality
        print("\n2️⃣ Testing Enhanced Search:")
        search_terms = [
            "forced",           # Should find "forced_situation"
            "Forced",           # Case insensitive
            "forced situation", # Space variant
            "Forced Situation", # Title case with space
            "gap",              # Should find "age_gap"  
            "Age Gap",          # Formatted search
            "character"         # Should find multiple results
        ]
        
        for term in search_terms:
            response = requests.get(f"{base_url}/api/search?q={term}")
            if response.status_code == 200:
                data = response.json()
                total = data['total_results']
                trope_count = len(data['tropes'])
                cat_count = len(data['categories'])
                print(f"   🔍 \"{term}\" → {total} results ({trope_count} tropes, {cat_count} categories)")
                
                # Show category matches if any
                if data['categories']:
                    cat_name = data['categories'][0].get('display_name', data['categories'][0]['name'])
                    print(f"       📂 Category match: \"{cat_name}\"")
            else:
                print(f"   ❌ Search failed for \"{term}\": {response.status_code}")
        
        # Test 3: Verify tropes have formatted categories
        print("\n3️⃣ Testing Trope Category Display:")
        response = requests.get(f"{base_url}/api/tropes")
        if response.status_code == 200:
            data = response.json()
            # Find a trope with categories
            trope_with_cats = None
            for trope in data['tropes']:
                if trope['categories']:
                    trope_with_cats = trope
                    break
            
            if trope_with_cats:
                print(f"   📖 Sample trope: \"{trope_with_cats['name']}\"")
                print(f"   🏷️  Categories: {', '.join(trope_with_cats['categories'])}")
            else:
                print("   ⚠️  No tropes with categories found")
        
        print("\n🎉 All tests completed!")
        print("\n💡 Try these in your browser:")
        print(f"   • Visit: {base_url}")
        print("   • Search for: 'forced', 'gap', 'character'")
        print("   • Click on Categories tab to see formatted names")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        print("Make sure the server is running with: ./start_server.sh")

if __name__ == "__main__":
    test_improvements()
