import os
import hashlib
import sys
from colorama import Fore
from pathlib import Path
from .config import load_settings


categories = load_settings()['categories']


CATEGORY_MAP = categories

def get_category(file):
    ext = file.suffix.lower()
    for category, extensions in categories.items():
        if ext in extensions:
            return category
    return 'Others ❓'

def hash_file(file_path):
    hasher = hashlib.sha256()
    try:
        file_size = os.path.getsize(file_path)
        processed = 0
        with open(file_path, 'rb') as afile:
            while chunk := afile.read(4096):
                hasher.update(chunk)
                processed += len(chunk)
                if file_size > 10 * 1024 * 1024:  
                    percent = int(processed / file_size * 100)
                    sys.stdout.write(f"\r{Fore.CYAN}Hashing: {file_path.name} [{percent}%]")
                    sys.stdout.flush()
        if file_size > 10 * 1024 * 1024:
            sys.stdout.write("\r" + " " * 80 + "\r")  
        return hasher.hexdigest()
    except Exception as e:
        print(f"\n{Fore.RED}[ERROR] Failed to hash {file_path}: {e}")
        return None

def format_file_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes/(1024*1024):.2f} MB"
    else:
        return f"{size_bytes/(1024*1024*1024):.2f} GB"