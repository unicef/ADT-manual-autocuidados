# ELI5 Generator for Self-Care Manual

An automated tool for generating "Explain Like I'm 5" simplified explanations for each HTML page in the self-care manual using OpenAI's GPT-4o.

## Overview

This script addresses accessibility and comprehension by:

1. **Scanning HTML files** for text content via `data-id` attributes
2. **Extracting all text** from each page using the i18n system
3. **Generating child-friendly explanations** using AI that simplify complex concepts
4. **Creating one ELI5 per section** in the format `sectioneli5-{page}-{section}`
5. **Updating i18n JSON files** with new ELI5 content
6. **Overwriting existing ELI5 content** when using force mode

## Features

- **Section-Based**: Generates one ELI5 explanation per HTML page/section
- **Multilingual Support**: Creates ELI5 content in both Spanish and English
- **Child-Friendly Language**: Uses simple words, analogies, and concepts kids understand
- **I18n Integration**: Works directly with your existing internationalization structure
- **Smart Content Extraction**: Collects all text content from a page using data-id attributes
- **Force Regeneration**: Option to overwrite existing ELI5 content
- **Creative Explanations**: Uses analogies with toys, games, animals, and superheroes

## Requirements

```bash
pip install openai beautifulsoup4
```

## Setup

1. **Get an OpenAI API Key** (if you don't already have one):
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key

2. **Set Environment Variable**:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

3. **Make the script executable**:
   ```bash
   chmod +x generate-eli5.py
   ```

## Usage

Run the script from your project directory:

```bash
# Normal mode - only generates ELI5 for sections without existing explanations
python3 generate-eli5.py

# Force mode - regenerates ALL ELI5 explanations (overwrites existing)
python3 generate-eli5.py --force
```

### Command Line Options

- `--force` or `-f`: Force regeneration of existing ELI5 explanations. This will overwrite all existing ELI5 content in the i18n files.

## How It Works

### 1. **File Processing**
- Scans for `*_adt.html` files and `index.html`
- Excludes files in `/old/`, `/skip/`, and `/assets/` directories
- Extracts section ID from filename (e.g., `26_0_adt.html` → `sectioneli5-26-0`)

### 2. **Content Extraction**
- Finds all elements with `data-id` attributes starting with `text-`
- Pulls corresponding text from the i18n JSON files
- Combines all text content from the page into one coherent passage

### 3. **ELI5 Generation**
- Sends the combined text to GPT-4o with child-friendly instructions
- Generates explanations using simple language and familiar analogies
- Creates engaging content appropriate for 5-year-olds

### 4. **I18n Integration**
- Adds ELI5 content to both Spanish and English i18n files
- Uses the key format: `sectioneli5-{page}-{section}`
- Example: `sectioneli5-26-0` for page 26, section 0

## Example Output

```
ELI5 Generator for Self-Care Manual
==================================================

Loaded es translations: 1568 entries
Loaded en translations: 1547 entries
Found 25 HTML files to process:
  - 26_0_adt.html
  - 26_1_adt.html
  - 27_0_adt.html
  ...

Processing: 26_0_adt.html
  Generating new ELI5 for 26-0 (es)
Generated ELI5 for section 26-0 (es): Imagina que tienes sentimientos como pequeños amigos...
  ✓ Added es ELI5: Imagina que tienes sentimientos como pequeños amigos que viven en tu...
  Generating new ELI5 for 26-0 (en)
Generated ELI5 for section 26-0 (en): Imagine you have feelings like little friends...
  ✓ Added en ELI5: Imagine you have feelings like little friends who live inside...

Updated content/i18n/es/texts.json
Updated content/i18n/en/texts.json

============================================================
ELI5 GENERATION SUMMARY
============================================================
HTML files processed: 15
ELI5 explanations generated: 30

Generated ELI5 explanations:
  📁 26_0_adt.html
     🔑 sectioneli5-26-0 (es)
     📝 Imagina que tienes sentimientos como pequeños amigos que viven en tu corazón...
```

## Example ELI5 Content

**Original Text (Complex):**
> "Emotional self-care is synonymous with feeling well-being. Each person is unique, therefore, the way of facing situations does not occur in the same way and following pre-established steps..."

**ELI5 Version:**
> "Imagine you have feelings like little friends who live inside you! 😊 Sometimes these friends are happy, sometimes they're sad 😢, and sometimes they're excited! 🎉 Taking care of your feelings is like taking care of these little friends - everyone does it in their own special way, just like how you're unique! ⭐"

## Key Features of Generated ELI5 Content

- **Simple vocabulary**: Uses words a 5-year-old knows
- **Familiar analogies**: Compares concepts to toys, games, animals, superheroes
- **Engaging tone**: Friendly and encouraging language with fun emojis 😊🌟💪
- **Concrete examples**: Abstract concepts made tangible
- **Concise format**: One paragraph maximum (50-80 words) to maintain attention
- **Creative openings**: Starts with engaging phrases like "Imagine you have..."

## Integration with Your System

The ELI5 content integrates seamlessly with your existing i18n structure:

```json
{
  "text-26-1": "Es por eso que el autocuidado emocional es sinónimo de sentir bienestar.",
  "text-26-2": "Cada persona es única, por lo tanto...",
  "sectioneli5-26-0": "Imagina que tienes sentimientos como pequeños amigos que viven en tu corazón...",
  "easyread-text-26-1": "🧘‍♀️ Emotional self-care means feeling good and happy."
}
```

## File Safety

- **Backup recommended**: Always backup your i18n files before running
- **Selective updates**: Only modifies files when new content is generated
- **Preserves structure**: Maintains existing JSON formatting
- **Error handling**: Continues processing even if individual files fail

## Troubleshooting

### Common Issues

1. **API Key Error**:
   ```
   Error: OpenAI API key not found
   ```
   Solution: Set the `OPENAI_API_KEY` environment variable

2. **No Text Content Found**:
   ```
   No text content found in file.html for es
   ```
   Solution: Check that the HTML file contains elements with `data-id` attributes starting with `text-`

3. **Permission Denied**:
   ```
   Error saving content/i18n/es/texts.json: Permission denied
   ```
   Solution: Check file permissions or run with appropriate privileges

## API Costs

The script uses OpenAI's GPT-4o API:
- Each ELI5 generation costs approximately $0.001-0.002
- For 25 pages (50 explanations), expect costs around $0.05-0.10
- Very cost-effective for the value provided

## Use Cases

- **Educational accessibility**: Helps readers who struggle with complex concepts
- **Child-friendly versions**: Makes self-care concepts accessible to younger audiences
- **Simplified learning**: Provides alternative explanations for difficult topics
- **Content review**: Helps authors see if their content can be simplified

## Contributing

To improve the script:
1. Test with a few files first to verify explanation quality
2. Adjust prompts if explanations need different tone or complexity
3. Modify the section ID extraction logic if needed
4. Enhance the content extraction to include other elements if desired
