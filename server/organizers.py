import shutil
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
from colorama import Fore
from .utils import get_category, format_file_size, CATEGORY_MAP
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

def organize_by_type(path):
    files = [f for f in Path(path).iterdir() if f.is_file()]
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return

    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by type in parallel...")

    category_counts = {category: 0 for category in CATEGORY_MAP.keys()}

    def move_file(file):
        try:
            category = get_category(file)
            dest_folder = Path(path) / category
            dest_folder.mkdir(exist_ok=True)
            dest_file = dest_folder / file.name

            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
                counter += 1
            
            shutil.move(str(file), str(dest_file))
            return category, None
        except Exception as e:
            return None, f"\n{Fore.RED}[ERROR] Error moving {file}: {e}"

    with ThreadPoolExecutor(max_workers=os.cpu_count() * 2) as executor:
        future_to_file = {executor.submit(move_file, file): file for file in files}
        for future in tqdm(as_completed(future_to_file), total=len(files),
                        desc=f"{Fore.WHITE}Moving files",
                        bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"):
            category, error = future.result()
            if category:
                category_counts[category] += 1
            if error:
                print(error)

    print(f"\n{Fore.GREEN}[✓] Files organized by type")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by category:")
    for category, count in category_counts.items():
        if count > 0:
            print(f"{Fore.YELLOW}  - {category}: {count} files")

            
def organize_by_date(path):
    files = [f for f in Path(path).iterdir() if f.is_file()]

    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return

    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by creation date...")

    month_counts = {}

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
            

            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
                counter += 1
                
            shutil.move(str(file), str(dest_file))
            

            if folder_name not in month_counts:
                month_counts[folder_name] = 0
            month_counts[folder_name] += 1
                
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Error moving {file}: {e}")


    print(f"\n{Fore.GREEN}[✓] Files organized by date")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by month:")
    for month, count in sorted(month_counts.items()):
        print(f"{Fore.YELLOW}  - {month}: {count} files")

def organize_by_size(path):

    files = [f for f in Path(path).iterdir() if f.is_file()]

    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return

    print(f"{Fore.CYAN}[+] Organizing {len(files)} files by size...")


    size_categories = {
        'Tiny (< 100KB) 🔍': 100 * 1024,
        'Small (100KB - 1MB) 📎': 1 * 1024 * 1024,
        'Medium (1MB - 100MB) 📘': 100 * 1024 * 1024,
        'Large (100MB - 1GB) 📦': 1 * 1024 * 1024 * 1024,
        'Huge (> 1GB) 🗄️': float('inf')
    }


    category_counts = {category: 0 for category in size_categories.keys()}


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
            

            counter = 1
            while dest_file.exists():
                dest_file = dest_folder / f"{file.stem}_{counter}{file.suffix}"
                counter += 1
                
            shutil.move(str(file), str(dest_file))
            category_counts[size_category] += 1
                
        except Exception as e:
            print(f"\n{Fore.RED}[ERROR] Error moving {file}: {e}")


    print(f"\n{Fore.GREEN}[✓] Files organized by size")
    print(f"{Fore.CYAN}[SUMMARY] Files organized by size category:")
    for category, count in category_counts.items():
        if count > 0:
            print(f"{Fore.YELLOW}  - {category}: {count} files")