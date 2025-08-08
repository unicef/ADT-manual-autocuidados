#!/usr/bin/env python3
"""
Utility to find available text strings and page ranges in the Spanish JSON file.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

def main():
    spanish_file = Path('content/i18n/es/texts.json')
    
    if not spanish_file.exists():
        print(f"Error: {spanish_file} not found.")
        return 1
    
    with open(spanish_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract all text-X-Y patterns
    pattern = re.compile(r'^text-(\d+)-(\d+)$')
    pages = defaultdict(list)
    
    for key in data.keys():
        match = pattern.match(key)
        if match:
            page_num = int(match.group(1))
            text_num = int(match.group(2))
            pages[page_num].append(text_num)
    
    if not pages:
        print("No text strings found matching pattern text-X-Y")
        return 1
    
    # Sort pages and their text numbers
    sorted_pages = sorted(pages.items())
    
    print("📄 Available Pages and Text Strings:")
    print("=" * 50)
    
    total_strings = 0
    for page_num, text_nums in sorted_pages:
        text_nums.sort()
        total_strings += len(text_nums)
        text_range = f"{min(text_nums)}-{max(text_nums)}" if len(text_nums) > 1 else str(text_nums[0])
        print(f"Page {page_num:2d}: {len(text_nums):2d} strings (text-{page_num}-{text_range})")
    
    print("=" * 50)
    print(f"Total: {len(sorted_pages)} pages, {total_strings} text strings")
    
    # Show page ranges for easy translation
    print("\n🎯 Suggested Translation Commands:")
    print("-" * 40)
    
    # Group consecutive pages
    page_numbers = [p[0] for p in sorted_pages]
    ranges = []
    start = page_numbers[0]
    end = start
    
    for i in range(1, len(page_numbers)):
        if page_numbers[i] == end + 1:
            end = page_numbers[i]
        else:
            if start == end:
                ranges.append(f"./translate.sh {start}")
            else:
                ranges.append(f"./translate.sh {start} {end}")
            start = page_numbers[i]
            end = start
    
    # Add the last range
    if start == end:
        ranges.append(f"./translate.sh {start}")
    else:
        ranges.append(f"./translate.sh {start} {end}")
    
    for cmd in ranges:
        print(cmd)
    
    print(f"\n# To translate all pages at once:")
    min_page = min(page_numbers)
    max_page = max(page_numbers)
    print(f"./translate.sh {min_page} {max_page}")
    
    return 0

if __name__ == '__main__':
    exit(main())
