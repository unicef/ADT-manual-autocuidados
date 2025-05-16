'''
HOW TO:
type python assets/utils/calculate_timecodes_easyread.py --json <path_to_json_file> --audio_folder <path_to_audio_folder> in the terminal'
for example: python3 assets/utils/calculate_timecodes_easyread.py --json ../../translations_es.json --audio_folder ../..
It uses the root of the project for audio file calculations.'
'''

import argparse
import json
import os
import re
import signal
import sys
import time
from tqdm import tqdm  # Optional, for better progress bars
from gradio_client import Client, handle_file

# Insert your Hugging Face token here.
ENTERPRISE_HF_TOKEN = "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"

# Global variables to store state
timecode_results = {}
output_file = "timecode_output.json"

def save_results():
    """Save current results to the output file"""
    print(f"Saving progress to {output_file}...")
    with open(output_file, "w", encoding="utf-8") as outfile:
        json.dump(timecode_results, outfile, ensure_ascii=False, indent=2)
    print(f"Progress saved with {len(timecode_results)} entries.")

def signal_handler(sig, frame):
    """Handle interruption signals by saving current progress"""
    print("\nInterrupted! Saving progress before exiting...")
    save_results()
    sys.exit(0)

def main():
    global timecode_results, output_file
    
    # Set up signal handlers for graceful interruption
    signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler) # Termination signal
    
    # Set up command-line arguments.
    parser = argparse.ArgumentParser(
        description="Generate timecodes using forced alignment from a JSON file and audio folder."
    )
    parser.add_argument("--json", required=True, help="Path to the target JSON file.")
    parser.add_argument("--audio_folder", required=True, help="Path to the folder containing audio files.")
    parser.add_argument("--output", default="timecode_output.json", help="Path to the output JSON file.")
    parser.add_argument("--continue_from", action="store_true", help="Continue from existing output file if it exists.")
    args = parser.parse_args()

    json_path = args.json
    audio_folder = args.audio_folder
    output_file = args.output

    # Load any existing results if continuing from previous run
    if args.continue_from and os.path.exists(output_file):
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                timecode_results = json.load(f)
            print(f"Loaded {len(timecode_results)} existing entries from {output_file}")
        except Exception as e:
            print(f"Error loading existing file: {e}")
            timecode_results = {}

    # Load JSON data.
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts = data.get("texts", {})
    audio_files = data.get("audioFiles", {})

    # Initialize client with retry logic
    max_retries = 3
    client = None
    
    for attempt in range(max_retries): 
        try:
            print(f"Connecting to Hugging Face API (attempt {attempt+1}/{max_retries})...")
            client = Client("JacobLinCool/forced-alignment", hf_token=ENTERPRISE_HF_TOKEN)
            print("Successfully connected to Hugging Face API")
            break
        except Exception as e:
            print(f"Error connecting to Hugging Face API: {e}")
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5  # Exponential backoff
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print("Max retries reached. Please check your network connection.")
                
                # If we have existing results, offer to continue working with them
                if args.continue_from and os.path.exists(output_file) and len(timecode_results) > 0:
                    print(f"You have {len(timecode_results)} entries already processed.")
                    print("You can run the script later when connection issues are resolved.")
                    save_results()  # Save any existing results
                sys.exit(1)

    # Regular expression to match keys like "easyread-text-6-0", "easyread-text-30-34", etc.
    valid_key_pattern = re.compile(r"^text-\d+-\d+$")

    # Count total items to process for progress reporting
    matching_keys = [k for k in texts.keys() if valid_key_pattern.match(k)]
    total_items = len(matching_keys)
    processed = 0

    # Iterate over each text entry and process only keys that match the pattern.
    for data_id, text in texts.items():
        # Skip if already processed
        if data_id in timecode_results:
            print(f"Skipping {data_id} (already processed)")
            processed += 1
            continue
            
        if not valid_key_pattern.match(data_id):
            continue

        relative_audio_path = audio_files.get(data_id)
        if not relative_audio_path:
            print(f"Warning: No audio file found for {data_id}. Skipping.")
            continue

        # Construct the full path to the audio file.
        audio_path = os.path.join(audio_folder, relative_audio_path)
        if not os.path.exists(audio_path):
            print(f"Warning: Audio file '{audio_path}' not found for {data_id}. Skipping.")
            continue

        processed += 1
        print(f"Processing {data_id}... ({processed}/{total_items})")
        try:
            # Call the forced alignment API.
            result = client.predict(
                audio=handle_file(audio_path),
                text=text,
                language="spa - Spanish",
                api_name="/align"
            )
            
            # Store the result
            timecode_results[data_id] = {
                "text": text,
                "audio": audio_path,
                "timecodes": result
            }
            
            # Save after each successful alignment
            save_results()
            
        except Exception as e:
            print(f"Error processing {data_id}: {e}")
            continue

    print(f"Processing complete. Results saved to {output_file}")

if __name__ == "__main__":
    main()