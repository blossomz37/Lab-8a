#!/usr/bin/env python3
"""
Test runner for the Personal Trope Database
Runs all tests and provides a summary
"""
import sys
import subprocess
import os

def run_test_file(test_file):
    """Run a single test file and return success status"""
    print(f"\n{'='*60}")
    print(f"Running {test_file}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run([sys.executable, test_file], 
                              capture_output=False, 
                              cwd=os.path.dirname(os.path.abspath(__file__)))
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running {test_file}: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Personal Trope Database - Test Suite")
    print(f"{'='*60}")
    
    # Get the tests directory
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    
    # List of test files to run
    test_files = [
        'test_api.py',
        'test_improvements.py'
    ]
    
    results = {}
    
    for test_file in test_files:
        test_path = os.path.join(tests_dir, test_file)
        if os.path.exists(test_path):
            results[test_file] = run_test_file(test_path)
        else:
            print(f"⚠️  Test file not found: {test_file}")
            results[test_file] = False
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = 0
    failed = 0
    
    for test_file, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_file:<25} {status}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
    
    if failed > 0:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
