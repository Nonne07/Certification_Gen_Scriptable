import os
import csv
import urllib.request
import argparse
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------
# Configuration (Matches app_v2.js)
# ---------------------------------------------------------------

CONFIG = {
    'canvasWidth': 2000,
    'canvasHeight': 1414,
    'name':   {'y': 520, 'size': 90, 'color': '#184551', 'font': 'DancingScript-Bold.ttf', 'align': 'center'},
    'course': {'y': 670, 'size': 28, 'color': '#000000', 'font': 'Inter-Bold.otf', 'align': 'center'},
    'date':   {'x': 625, 'y': 707, 'size': 27, 'color': '#000000', 'font': 'Inter-Regular.otf', 'letterSpacing': 1.5, 'align': 'center'},
    'rank':   {'x': 885, 'y': 749, 'size': 28, 'color': '#e55627', 'font': 'Inter-Bold.otf', 'align': 'left'}
}

import sys
import os

def get_base_path():
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return Path(base_path)

def get_font(font_name, size):
    # Scale font size up by 1.25
    scaled_size = int(size * 1.25)
    font_path = get_base_path() / '.fonts' / font_name
    if font_path.exists():
        return ImageFont.truetype(str(font_path), scaled_size)
    
    print(f"\n[CRITICAL ERROR] Missing Font: {font_name}")
    print("If you are running from source, please download the font and place it in the '.fonts' folder.")
    print("If you are building an .exe, make sure the .fonts folder is included in the PyInstaller build.\n")
    sys.exit(1)

def get_template_path(course_name, app_config):
    default_template = app_config.get("default_template", "Template.png")
    template_name = default_template
    
    if course_name:
        upper_course = course_name.strip().upper()
        templates_dict = app_config.get("templates", {})
        
        for t_name, courses in templates_dict.items():
            valid_courses = [c.upper() for c in courses]
            if upper_course in valid_courses:
                template_name = t_name
                break
                
    return get_base_path() / template_name

def draw_text_with_spacing(draw, x, y, text, font, fill, letter_spacing=0, align='center'):
    """Draws text centered or left-aligned at x,y with optional letter spacing."""
    # Scale coordinates and spacing
    x = x * 1.25
    y = y * 1.25
    letter_spacing = letter_spacing * 1.25
    
    anchor = "ms" if align == "center" else "ls"
    
    if letter_spacing == 0:
        draw.text((x, y), text, font=font, fill=fill, anchor=anchor)
        return

    # Calculate total width for center alignment
    char_widths = [draw.textlength(char, font=font) for char in text]
    
    if align == 'center':
        total_width = sum(char_widths) + letter_spacing * (len(text) - 1)
        current_x = x - (total_width / 2)
    else:
        current_x = x
        
    for char, char_w in zip(text, char_widths):
        draw.text((current_x, y), char, font=font, fill=fill, anchor="ls") # Always draw individual chars from left bottom
        current_x += char_w + letter_spacing

def load_config():
    config_path = Path("config.json")
    default_config = {
        "__COMMENT_OUTPUT__": "Options for output_preference: 'png', 'pdf', 'both'",
        "output_preference": "both",
        "__COMMENT_ZIP__": "Options for zip_output: true, false",
        "zip_output": False,
        "default_template": "Template.png",
        "templates": {
            "Template.png": [
                "FUNDAMENTAL OF IC DESIGN AND VERIFICATION",
                "ADVANCED DESIGN VERIFICATION"
            ],
            "PDTemplate.png": [
                "PHYSICAL DESIGN"
            ]
        },
        "ranks": [
            "EXCELLENT",
            "VERY GOOD",
            "GOOD",
            "AVERAGE",
            "PASS"
        ]
    }
    
    if not config_path.exists():
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=4)
        except Exception as e:
            print(f"Could not create config.json: {e}")
        return default_config
        
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            user_config = json.load(f)
            # Merge defaults for any missing keys
            for k, v in default_config.items():
                if k not in user_config:
                    user_config[k] = v
            return user_config
    except Exception as e:
        print(f"Error reading config.json: {e}. Using defaults.")
        return default_config

def generate_certificate(record, output_dir, fmt='both', app_config=None):
    name = record.get('Name', '').strip()
    course = record.get('Course', '').strip()
    date = record.get('Date', '').strip()
    rank = record.get('Rank', '').strip()

    if not name:
        return

    if app_config:
        # Validate course across all template definitions
        all_valid_courses = []
        for courses in app_config.get("templates", {}).values():
            all_valid_courses.extend([c.upper() for c in courses])
            
        if all_valid_courses and course and course.upper() not in all_valid_courses:
            print(f"Error: Course '{course}' for '{name}' is not found in config.json. Skipping.")
            return
            
        valid_ranks = [r.upper() for r in app_config.get("ranks", [])]
        if valid_ranks and rank.upper() not in valid_ranks:
            print(f"Error: Rank '{rank}' for '{name}' is not found in config.json. Skipping.")
            return

    template_file = get_template_path(course, app_config)
    if not Path(template_file).exists():
        print(f"Template {template_file} not found. Skipping {name}.")
        return

    img = Image.open(template_file).convert('RGBA')
    
    # We do not resize img because it is exactly 2000x1414, we just draw on it!
    bg = Image.new('RGB', (CONFIG['canvasWidth'], CONFIG['canvasHeight']), (255, 255, 255))
    bg.paste(img, (0, 0), img)
    img = bg

    draw = ImageDraw.Draw(img)
    center_x = (1600 / 2) # Original center in 1600 logic
    
    # Draw Name
    if name:
        cfg = CONFIG['name']
        font = get_font(cfg['font'], cfg['size'])
        draw_text_with_spacing(draw, center_x, cfg['y'], name, font, cfg['color'], align=cfg['align'])

    # Draw Course
    if course:
        cfg = CONFIG['course']
        font = get_font(cfg['font'], cfg['size'])
        draw_text_with_spacing(draw, center_x, cfg['y'], course, font, cfg['color'], align=cfg['align'])

    # Draw Date
    if date:
        cfg = CONFIG['date']
        font = get_font(cfg['font'], cfg['size'])
        draw_text_with_spacing(draw, cfg['x'], cfg['y'], date, font, cfg['color'], letter_spacing=cfg.get('letterSpacing', 0), align=cfg['align'])

    # Draw Rank
    if rank:
        cfg = CONFIG['rank']
        font = get_font(cfg['font'], cfg['size'])
        draw_text_with_spacing(draw, cfg['x'], cfg['y'], rank, font, cfg['color'], align=cfg['align'])

    # Clean filename
    safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    
    out_png = Path(output_dir) / f"{safe_name}.png"
    out_pdf = Path(output_dir) / f"{safe_name}.pdf"

    if fmt in ['png', 'both']:
        img.save(out_png, "PNG")
    if fmt in ['pdf', 'both']:
        img.save(out_pdf, "PDF", resolution=100.0)

    print(f"Generated: {safe_name}")


def main():
    parser = argparse.ArgumentParser(description="Generate Certificates from CSV")
    parser.add_argument("--csv", help="Path to a single input CSV file", type=str)
    parser.add_argument("--input_folder", help="Path to a folder containing multiple CSV files", type=str, default="test-input")
    parser.add_argument("--output", help="Path to output folder", type=str, default="test-output")
    parser.add_argument("--format", help="Output format: png, pdf, or both", choices=['png', 'pdf', 'both'], default='both')

    args = parser.parse_args()

    app_config = load_config()
    output_format = app_config.get("output_preference", args.format)

    input_dir = Path(args.input_folder)
    output_dir = Path(args.output)
    
    # Auto-create the default input folder so the user can easily drop files in it
    if args.input_folder == "test-input":
        input_dir.mkdir(parents=True, exist_ok=True)
        
    output_dir.mkdir(parents=True, exist_ok=True)



    csv_files = []
    if args.csv:
        csv_files.append(Path(args.csv))
    else:
        if input_dir.exists() and input_dir.is_dir():
            csv_files.extend(list(input_dir.glob("*.csv")))
            if not csv_files:
                print(f"No CSV files found in '{args.input_folder}'. Please toss your .csv file into that folder and run again.")
                return
        else:
            print(f"Error: Input folder {args.input_folder} does not exist.")
            return
    for csv_path in csv_files:
        print(f"Processing CSV: {csv_path.name}...")
        try:
            with open(csv_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                # Check for required headers
                headers = reader.fieldnames
                if not headers or 'Name' not in headers:
                    print(f"Warning: CSV '{csv_path.name}' must have a 'Name' column. Skipping.")
                    continue
                    
                for row in reader:
                    generate_certificate(row, output_dir, output_format, app_config)
        except Exception as e:
            print(f"Error reading {csv_path}: {e}")

    if app_config.get("zip_output", False) and output_dir.exists() and any(output_dir.iterdir()):
        print(f"Zipping output folder: {output_dir}")
        zip_path = shutil.make_archive(str(output_dir), 'zip', str(output_dir))
        print(f"Zip created: {zip_path}")
        print("Deleting unzipped raw files...")
        shutil.rmtree(str(output_dir))
        
if __name__ == '__main__':
    main()
