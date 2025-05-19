#!/usr/bin/env python3
import os
import shutil
import hashlib
import argparse
import time
import sys
from pathlib import Path
from datetime import datetime

try:
    from tqdm import tqdm
    from colorama import Fore, Style, init, Back
    init(autoreset=True)
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tqdm", "colorama"])
    from tqdm import tqdm
    from colorama import Fore, Style, init, Back
    init(autoreset=True)

# ASCII Art Logo
LOGO = r"""
 ╔════════════════════════════════════════════════════════════════╗
 ║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗  ║
 ║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║  ║
 ║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║  ║
 ║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║  ║
 ║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
 ║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
 ║                   FILE ORGANIZER v1.0                          ║
 ╚════════════════════════════════════════════════════════════════╝
"""

# Friendly names by category with terminal-style emoji icons
CATEGORY_MAP = {
    'Your Music 🎵': ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'],
    'Your Videos 🎬': ['.mp4', '.mkv', '.mov', '.avi', '.wmv', '.webm'],
    'Your Images 🖼️': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
    'Your Documents 📄': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.md'],
    'Your Archives 📦': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
    'Your Scripts 💻': ['.py', '.js', '.html', '.css', '.cpp', '.c', '.java', '.sh', '.php', '.rb'],
    'Your Executables ⚙️': ['.exe', '.msi', '.app', '.dmg', '.deb', '.rpm'],
    'Your Fonts 🔤': ['.ttf', '.otf', '.woff', '.woff2'],
    'Your E-books 📚': ['.epub', '.mobi', '.azw3', '.fb2'],
    'Others 🔮': []
}

def get_category(file):
    """Get the category of a file based on its extension."""
    ext = file.suffix.lower()
    for category, extensions in CATEGORY_MAP.items():
        if ext in extensions:
            return category
    return 'Others 🔮'

def hash_file(file_path):
    """Calculate SHA256 hash of a file with progress indicators."""
    hasher = hashlib.sha256()
    try:
        file_size = os.path.getsize(file_path)
        processed = 0
        
        with open(file_path, 'rb') as afile:
            while chunk := afile.read(4096):
                hasher.update(chunk)
                processed += len(chunk)
                # Print progress for large files
                if file_size > 10 * 1024 * 1024:  # Only show for files > 10MB
                    percent = int(processed / file_size * 100)
                    sys.stdout.write(f"\r{Fore.CYAN}Hashing: {file_path.name} [{percent}%]")
                    sys.stdout.flush()
        
        if file_size > 10 * 1024 * 1024:
            sys.stdout.write("\r" + " " * 80 + "\r")  # Clear the line
            
        return hasher.hexdigest()
    except Exception as e:
        print(f"\n{Fore.RED}[ERROR] Failed to hash {file_path}: {e}")
        return None

def format_file_size(size_bytes):
    """Format file size in human-readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes/(1024*1024):.2f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.2f} GB"

def print_header():
    """Print the header with ASCII art logo."""
    print(f"{Fore.CYAN}{LOGO}")
    print(f"{Fore.GREEN}{'='*70}")
    print(f"{Fore.YELLOW}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting File Organizer")
    print(f"{Fore.GREEN}{'='*70}\n")

def remove_duplicates(path):
    """Remove duplicate files based on SHA256 hash."""
    seen_hashes = {}
    space_saved = 0
    duplicate_count = 0
    
    # Get all files recursively
    print(f"{Fore.YELLOW}[+] Scanning for duplicates...")
    all_files = list(Path(path).rglob('*'))
    files = [f for f in all_files if f.is_file()]
    
    # Skip if no files
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return 0, 0
    
    print(f"{Fore.CYAN}[INFO] Found {len(files)} files to scan")
    
    # Show progress bar
    progress_bar = tqdm(
        files, 
        bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"
    )
    
    for file in progress_bar:
        progress_bar.set_description(f"{Fore.WHITE}Processing {file.name[:15]}...")
        
        try:
            file_size = file.stat().st_size
            file_hash = hash_file(file)
            
            if file_hash is None:
                continue
                
            if file_hash in seen_hashes:
                duplicate_count += 1
                space_saved += file_size
                original_file = seen_hashes[file_hash]
                print(f"\n{Fore.RED}[DUPLICATE] {file} ({format_file_size(file_size)})")
                print(f"{Fore.YELLOW}[ORIGINAL] {original_file}")
                
                try:
                    os.remove(file)
                    print(f"{Fore.GREEN}[REMOVED] Successfully deleted duplicate")
                except Exception as e:
                    print(f"{Fore.RED}[ERROR] Failed to remove {file}: {e}")
            else:
                seen_hashes[file_hash] = file
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Failed processing {file}: {e}")
    
    print(f"\n{Fore.GREEN}[✓] Duplicate removal completed")
    print(f"{Fore.CYAN}[STATS] Removed {duplicate_count} duplicate files")
    print(f"{Fore.CYAN}[STATS] Saved {format_file_size(space_saved)} of disk space")
    
    return duplicate_count, space_saved

def organize_by_type(path):
    """Organize files by their type/category."""
    files = [f for f in Path(path).iterdir() if f.is_file()]
    
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return
    
    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by type...")
    
    # Initialize category counters
    category_counts = {category: 0 for category in CATEGORY_MAP.keys()}
    
    # Progress bar
    progress_bar = tqdm(
        files, 
        bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"
    )
    
    for file in progress_bar:
        category = get_category(file)
        progress_bar.set_description(f"{Fore.WHITE}Moving {file.name[:15]} to {category}")
        
        dest_folder = Path(path) / category
        dest_folder.mkdir(exist_ok=True)
        dest_file = dest_folder / file.name
        
        # Handle filename conflicts
        counter = 1
        while dest_file.exists():
            dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
            counter += 1
        
        try:
            shutil.move(str(file), str(dest_file))
            category_counts[category] += 1
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Error moving {file}: {e}")
    
    # Print summary
    print(f"\n{Fore.GREEN}[✓] Files organized by type")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by category:")
    for category, count in category_counts.items():
        if count > 0:
            print(f"{Fore.YELLOW}  - {category}: {count} files")

def organize_by_date(path):
    """Organize files by their creation date (YYYY-MM folders)."""
    files = [f for f in Path(path).iterdir() if f.is_file()]
    
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return
    
    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by creation date...")
    
    # Track months for summary
    month_counts = {}
    
    # Progress bar
    progress_bar = tqdm(
        files, 
        bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"
    )
    
    for file in progress_bar:
        try:
            created_time = datetime.fromtimestamp(file.stat().st_ctime)
            folder_name = created_time.strftime('%Y-%m (%B)')
            progress_bar.set_description(f"{Fore.WHITE}Moving {file.name[:15]} to {folder_name}")
            
            dest_folder = Path(path) / folder_name
            dest_folder.mkdir(exist_ok=True)
            dest_file = dest_folder / file.name
            
            # Handle filename conflicts
            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
                counter += 1
                
            shutil.move(str(file), str(dest_file))
            
            # Update month count
            if folder_name not in month_counts:
                month_counts[folder_name] = 0
            month_counts[folder_name] += 1
                
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Error moving {file}: {e}")
    
    # Print summary
    print(f"\n{Fore.GREEN}[✓] Files organized by date")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by month:")
    
    for month, count in sorted(month_counts.items()):
        print(f"{Fore.YELLOW}  - {month}: {count} files")

def organize_by_size(path):
    """Organize files by their size."""
    files = [f for f in Path(path).iterdir() if f.is_file()]
    
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return
    
    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by size...")
    
    # Size categories
    size_categories = {
        'Tiny (< 100KB) 🔍': 100 * 1024,
        'Small (100KB - 1MB) 📎': 1 * 1024 * 1024,
        'Medium (1MB - 100MB) 📘': 100 * 1024 * 1024,
        'Large (100MB - 1GB) 📦': 1 * 1024 * 1024 * 1024,
        'Huge (> 1GB) 🗄️': float('inf')
    }
    
    # Track size categories for summary
    category_counts = {category: 0 for category in size_categories.keys()}
    
    # Progress bar
    progress_bar = tqdm(
        files, 
        bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"
    )
    
    for file in progress_bar:
        try:
            size = file.stat().st_size
            size_category = None
            
            for category, threshold in size_categories.items():
                if size < threshold:
                    size_category = category
                    break
            
            progress_bar.set_description(f"{Fore.WHITE}Moving {file.name[:15]} ({format_file_size(size)}) to {size_category}")
            
            dest_folder = Path(path) / size_category
            dest_folder.mkdir(exist_ok=True)
            dest_file = dest_folder / file.name
            
            # Handle filename conflicts
            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
                counter += 1
                
            shutil.move(str(file), str(dest_file))
            category_counts[size_category] += 1
                
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Error moving {file}: {e}")
    
    # Print summary
    print(f"\n{Fore.GREEN}[✓] Files organized by size")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by size category:")
    
    for category, count in category_counts.items():
        if count > 0:
            print(f"{Fore.YELLOW}  - {category}: {count} files")

def main():
    """Main function to handle CLI arguments and execute appropriate functions."""
    parser = argparse.ArgumentParser(
        description="Terminal File Organizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"{Fore.CYAN}Example usage:\n"
               f"{Fore.YELLOW}  python file_organizer.py ~/Downloads --mode type --remove-duplicates{Style.RESET_ALL}"
    )
    parser.add_argument("path", help="Path to the directory to organize")
    parser.add_argument("--mode", choices=['type', 'date', 'size'], default='type', 
                        help="Organizing mode (type, date, or size)")
    parser.add_argument("--remove-duplicates", action="store_true", 
                        help="Remove duplicate files before organizing")
    args = parser.parse_args()

    path = args.path
    mode = args.mode

    # Print header
    print_header()
    
    # Check if path exists
    if not os.path.exists(path):
        print(f"{Fore.RED}[ERROR] The path '{path}' does not exist!")
        return
    
    print(f"{Fore.WHITE}Directory: {Fore.GREEN}{path}")
    print(f"{Fore.WHITE}Mode: {Fore.GREEN}{mode}")
    print(f"{Fore.WHITE}Remove Duplicates: {Fore.GREEN}{args.remove_duplicates}")
    print()
    
    start_time = time.time()
    duplicate_count = 0
    space_saved = 0
    
    # Remove duplicates if requested
    if args.remove_duplicates:
        duplicate_count, space_saved = remove_duplicates(path)

    # Organize files based on selected mode
    if mode == 'type':
        organize_by_type(path)
    elif mode == 'date':
        organize_by_date(path)
    elif mode == 'size':
        organize_by_size(path)

    # Print final summary
    elapsed_time = time.time() - start_time
    print(f"\n{Fore.GREEN}{'='*70}")
    print(f"{Fore.YELLOW}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Operation completed")
    print(f"{Fore.CYAN}Total time: {elapsed_time:.2f} seconds")
    
    if args.remove_duplicates:
        print(f"{Fore.CYAN}Duplicates removed: {duplicate_count}")
        print(f"{Fore.CYAN}Space saved: {format_file_size(space_saved)}")
    
    print(f"{Fore.GREEN}{'='*70}")
    print(f"{Fore.GREEN}[✓] All tasks completed successfully!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Fore.YELLOW}[!] Operation cancelled by user")
        print(f"{Fore.GREEN}[✓] Exiting gracefully...")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Fore.RED}[CRITICAL ERROR] {str(e)}")
        sys.exit(1)