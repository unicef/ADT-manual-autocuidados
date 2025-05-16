'''
HOW TO:
type python assets/utils/calculate_timecodes.py --json <path_to_json_file> --audio_folder <path_to_audio_folder> in the terminal'
for example: python3 assets/utils/calculate_timecodes.py --json ../../translations_es.json --audio_folder ../..
It uses the root of the project for audio file calculations.'
'''

import argparse
import json
import os
import re
from gradio_client import Client, handle_file

# Insert your Hugging Face token here.
# WARNING: Hardcoding tokens can expose them to security risks.
HF_TOKEN = "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"

def main():
    # Set up command-line arguments.
    parser = argparse.ArgumentParser(
        description="Generate timecodes using forced alignment from a JSON file and audio folder."
    )
    parser.add_argument("--json", required=True, help="Path to the target JSON file.")
    parser.add_argument("--audio_folder", required=True, help="Path to the folder containing audio files.")
    args = parser.parse_args()

    json_path = args.json
    audio_folder = args.audio_folder

    # Load JSON data.
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts = data.get("texts", {})
    audio_files = data.get("audioFiles", {})

    # Initialize the forced alignment client with your token.
    client = Client("JacobLinCool/forced-alignment", hf_token=HF_TOKEN)

    # Dictionary to hold the results.
    timecode_results = {}

    # Regular expression to match keys like "text-0-0", "text-39-7", etc.
    # valid_key_pattern = re.compile(r"^text-\d+-\d+$")
    valid_key_pattern = re.compile(r"^img-\d+-\d+$")

    # Iterate over each text entry and process only keys that match the pattern.
    for data_id, text in texts.items():
        if not valid_key_pattern.match(data_id):
            continue

         # Check if this is an image text with content
        is_image = data_id.startswith("img-")

        relative_audio_path = audio_files.get(data_id)
        if not relative_audio_path:
            print(f"Warning: No audio file found for {data_id}. Skipping.")
            continue

        # Construct the full path to the audio file.
        audio_path = os.path.join(audio_folder, relative_audio_path)
        if not os.path.exists(audio_path):
            print(f"Warning: Audio file '{audio_path}' not found for {data_id}. Skipping.")
            continue

        print(f"Processing {data_id}...")
        try:
            # Call the forced alignment API.
            result = client.predict(
                audio=handle_file(audio_path),
                text=text,
                language="spa - Spanish",
                api_name="/align"
            )
        except Exception as e:
            print(f"Error processing {data_id}: {e}")
            continue

        # Store the results.
        timecode_results[data_id] = {
            "text": text,
            "audio": audio_path,
            "isImage": is_image,
            "timecodes": result  # Expected to be word-level timecodes with inline timing.
        }

    # Write the results to an output JSON file.
    output_file = "timecode_output.json"
    with open(output_file, "w", encoding="utf-8") as outfile:
        json.dump(timecode_results, outfile, ensure_ascii=False, indent=2)

    print(f"Timecode file generated: {output_file}")

if __name__ == "__main__":
    main()