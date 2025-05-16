#!/usr/bin/env python3
# filepath: /Users/eliasc/Dev/ADT-cuaderno5-chapter1/combine_timecodes.py
"""
Script to combine individual timecode JSON files into a single consolidated file
Usage: python combine_timecodes.py
"""

import os
import json
import sys
from pathlib import Path

# Configuration
INPUT_DIRECTORY = "./audio/es_uy/results/es_uy/timecodes"  # Directory containing individual timecode files
OUTPUT_FILE_PATH = "./timecode_output_es_uy.json"  # Output path for combined file
LANGUAGE_CODE = "es_uy"  # Language code for file naming

def combine_timecode_files():
    """Combine all individual timecode JSON files into a single file"""
    print(f"Combining timecode files from {INPUT_DIRECTORY} into {OUTPUT_FILE_PATH}...")
    
    # Create an object to hold all combined data
    combined_data = {}
    
    try:
        # Get all JSON files in the directory
        input_dir = Path(INPUT_DIRECTORY)
        if not input_dir.exists():
            print(f"Error: Directory {INPUT_DIRECTORY} does not exist.")
            return
            
        json_files = [f for f in input_dir.iterdir() if f.is_file() and f.suffix == '.json']
        
        print(f"Found {len(json_files)} JSON files to process")
        
        # Process each JSON file
        for file_path in json_files:
            file_name = file_path.name
            print(f"Processing {file_name}...")
            
            try:
                # Read and parse the file content
                with open(file_path, 'r', encoding='utf-8') as file:
                    data = json.load(file)
                
                # Extract the element ID and timecode data
                element_ids = list(data.keys())
                if element_ids and element_ids[0] in data:
                    element_id = element_ids[0]
                    # Add to combined data
                    combined_data[element_id] = data[element_id]
                    print(f"Added timecode data for {element_id}")
                else:
                    print(f"Warning: Skipping file {file_name}: Invalid format or missing element ID")
            except Exception as file_error:
                print(f"Error processing file {file_name}: {str(file_error)}")
        
        # Write the combined data to the output file
        if combined_data:
            with open(OUTPUT_FILE_PATH, 'w', encoding='utf-8') as output_file:
                json.dump(combined_data, output_file, indent=2, ensure_ascii=False)
            print(f"Successfully combined {len(combined_data)} timecode entries into {OUTPUT_FILE_PATH}")
        else:
            print("Error: No valid timecode data found. Output file not created.")
            
    except Exception as error:
        print(f"Error combining timecode files: {str(error)}")

if __name__ == "__main__":
    # If language code is provided as argument, use it
    if len(sys.argv) > 1:
        LANGUAGE_CODE = sys.argv[1]
        OUTPUT_FILE_PATH = f"./timecode_output_{LANGUAGE_CODE}.json"
        
    combine_timecode_files()