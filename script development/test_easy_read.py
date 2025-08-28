#!/usr/bin/env python3
"""
Test script to demonstrate the improved easy-read functionality
"""

import sys

# Add the current directory to the path so we can import
sys.path.append('.')

# Import the new function manually since the file has hyphens
import importlib.util
spec = importlib.util.spec_from_file_location(
    "regenerate_easy_read_v2", 
    "regenerate-easy-read-v2.py"
)
regenerate_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(regenerate_module)

should_skip_text = regenerate_module.should_skip_text

# Test cases to demonstrate the skip logic
test_cases = [
    # Cases that SHOULD be skipped
    ("text-6-1", "9"),  # Single number
    ("text-0-0", "Self-Care Manual"),  # Short title
    ("text-13-11", "True"),  # Simple label
    ("text-19-3", "1. Maintaining a healthy diet:"),  # Short numbered item
    ("text-14-1", "Myth"),  # Single word
    ("text-13-15", "Myth:"),  # Simple label
    
    # Cases that SHOULD be processed
    ("text-10-2", "Among the principles of self-care, some of the following elements should be considered when addressing it (Uribe, 1999; Correa, 2016):"),
    ("text-11-2", "Incorporating self-care routines is key to improving quality of life and preventing both physical and mental illnesses (such as anxiety, depression, among others), as well as for recovery in the event of experiencing them."),
    ("text-10-3", "It is a life act that enables individuals to become active participants in the care of their health and is a voluntary process undertaken by the person for themselves."),
]

def main():
    print("🧪 TESTING IMPROVED EASY-READ SCRIPT")
    print("=" * 50)
    
    skipped_count = 0
    processed_count = 0
    
    for text_id, text_content in test_cases:
        print(f"\n📝 Testing: {text_id}")
        print(f"Text: '{text_content}'")
        
        should_skip, reason = should_skip_text(text_content)
        
        if should_skip:
            print(f"✅ SKIP: {reason}")
            skipped_count += 1
        else:
            print(f"🔄 PROCESS: {reason}")
            print("Would generate easy-read version with emojis...")
            processed_count += 1
    
    print(f"\n📊 SUMMARY:")
    print(f"- Skipped: {skipped_count} items")
    print(f"- To process: {processed_count} items")
    print(f"- Total: {len(test_cases)} items")
    
    # Demonstrate transformation on one complex text
    print(f"\n🎯 EXAMPLE TRANSFORMATION:")
    print("=" * 50)
    complex_text = test_cases[6][1]  # The text-10-2 example
    print(f"ORIGINAL:")
    print(f'"{complex_text}"')
    
    print(f"\nThis would be transformed into easy-read format with:")
    print("• Short, simple sentences")
    print("• Common words instead of complex ones")
    print("• Relevant emojis (💪 🧠 ❤️ etc.)")
    print("• Bullet points for clarity")
    print("• Shorter overall length")

if __name__ == "__main__":
    main()
