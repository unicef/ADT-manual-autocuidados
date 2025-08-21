# Image Description Generator

An automated tool for generating Spanish alt text descriptions for images in HTML files using OpenAI's GPT-4o Vision API.

## Overview

This script addresses accessibility requirements by:

1. **Scanning HTML files** for images with `data-id` attributes
2. **Checking existing descriptions** in the i18n JSON files (`content/i18n/es/texts.json` and `content/i18n/en/texts.json`)
3. **Generating AI-powered descriptions** for images missing alt text using GPT-4o Vision
4. **Using contextual information** from surrounding text elements via the i18n system
5. **Updating i18n JSON files** with new image descriptions
6. **Removing redundant aria-label attributes** when proper descriptions exist

## Features

- **Multilingual Support**: Generates descriptions in both Spanish and English
- **Context-Aware**: Uses existing text from the i18n system to provide relevant context to the AI
- **I18n Integration**: Works directly with your existing internationalization structure
- **Length Guidelines**: Aims for under 125 characters but allows longer descriptions when absolutely necessary
- **Smart Detection**: Identifies which images need descriptions and which already have them
- **Batch Processing**: Processes all HTML files in the project automatically
- **Safe Updates**: Only modifies files when changes are needed

## Setup

1. **Install required packages:**
```bash
pip install openai beautifulsoup4 requests pillow
```

2. **Set your OpenAI API key:**
```bash
export OPENAI_API_KEY='your-api-key-here'
```

## Usage

Run the script from your project directory:

```bash
# Normal mode - only generates descriptions for missing images
python generate-image-descriptions.py

# Force mode - regenerates ALL image descriptions (overwrites existing)
python generate-image-descriptions.py --force
```

### Command Line Options

- `--force` or `-f`: Force regeneration of existing image descriptions. This will overwrite all existing descriptions in the i18n files, even if they already exist.

## What it does

1. **Loads existing translations** from `content/i18n/es/texts.json` and `content/i18n/en/texts.json`
2. **Scans all HTML files** (excluding the `/old/` directory)
3. **For each image with a `data-id`**:
   - Checks if a description already exists in the i18n files
   - If missing, extracts contextual text from the same page using the i18n data
   - Generates an appropriate description using GPT-4o Vision
   - Adds the description to the appropriate i18n JSON files
4. **Updates the i18n JSON files** with any new descriptions
5. **Removes redundant aria-label attributes** from HTML when descriptions exist

## How It Works with Your I18n System

The script integrates seamlessly with your existing internationalization structure:

### Image ID Pattern
Your images follow the pattern: `img-{page}-{number}`
- Example: `img-10-1` for the first image on page 10

### Context Extraction  
The script automatically finds related text on the same page:
- For `img-10-1`, it looks for `text-10-*` entries in the i18n files
- Uses this context to generate more accurate descriptions

### I18n File Structure
The script adds descriptions directly to your existing JSON structure:

```json
{
  "img-0-1": "Imagen: Portada de un manual de autocuidado con ilustración y logotipos de Fundasil e Iniciativa Spotlight.",
  "img-10-1": "Imagen: Ilustración de una persona con los ojos cerrados, vistiendo una camisa rosa, simbolizando la meditación y el autocuidado.",
  "text-10-1": "La meditación es una práctica importante...",
  "text-10-2": "Encuentra un lugar tranquilo..."
}
```

## Example Output

```
Image Description Generator for HTML Files
==================================================
Found 25 HTML files to process:
  - 6_0_adt.html
  - 8_0_adt.html
  - index.html
  ...

Processing: 6_0_adt.html
  Found image: ./images/cover-page-manual.png
    Missing alt text, generating description...
    Generated description for cover-page-manual.png: Portada del manual de autocuidado con ilustraciones coloridas y logotipos
    ✓ Added alt text: Portada del manual de autocuidado con ilustraciones coloridas y logotipos
  ✓ Updated 6_0_adt.html

============================================================
PROCESSING SUMMARY
============================================================
Files processed: 3
Images updated: 5

Updated images:
  📁 6_0_adt.html
     🖼️  ./images/cover-page-manual.png
     📝 Portada del manual de autocuidado con ilustraciones coloridas y logotipos
```

## Features

- **Smart context detection**: Uses surrounding text to provide better descriptions
- **Spanish language**: Generates descriptions in Spanish for the manual
- **Accessibility focused**: Creates concise, descriptive alt text under 125 characters
- **Safe processing**: Only processes images that actually need alt text
- **Backup friendly**: You can version control your files before running

## Notes

- The script uses GPT-4o which costs money per API call
- Each image without alt text will make one API call
- Generated descriptions are optimized for screen readers
- The script respects existing alt text and won't overwrite it
