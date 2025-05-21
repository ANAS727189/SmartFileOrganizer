# server/duplicate_remover.py
import os
from pathlib import Path
from tqdm import tqdm
from colorama import Fore
from concurrent.futures import ThreadPoolExecutor, as_completed
from .utils import hash_file, format_file_size

def remove_duplicates(path):
    files = [f for f in Path(path).iterdir() if f.is_file()]
    
    if not files:
        print(f"{Fore.YELLOW}[!] No files found in {path}")
        return 0, 0

    print(f"{Fore.CYAN}[+] Scanning {len(files)} files for duplicates in parallel...")
    
    hash_dict = {}
    total_size = 0

    def process_file(file):
        file_hash = hash_file(file)
        return file, file_hash

    # Parallel hashing
    with ThreadPoolExecutor(max_workers=os.cpu_count() * 2) as executor:
        future_to_file = {executor.submit(process_file, file): file for file in files}
        for future in tqdm(as_completed(future_to_file), total=len(files),
                          desc=f"{Fore.WHITE}Hashing files",
                          bar_format=f"{Fore.BLUE}{{l_bar}}{Fore.CYAN}{{bar}} {Fore.GREEN}{{n_fmt}}/{Fore.GREEN}{{total_fmt}} [{Fore.YELLOW}{{elapsed}}<{Fore.YELLOW}{{remaining}}] {Fore.MAGENTA}{{percentage:3.0f}}%"):
            file, file_hash = future.result()
            if file_hash:
                if file_hash in hash_dict:
                    hash_dict[file_hash].append(file)
                else:
                    hash_dict[file_hash] = [file]

    duplicate_count = 0
    space_saved = 0
    
    for file_hash, file_list in hash_dict.items():
        if len(file_list) > 1:
            original = file_list[0]
            duplicates = file_list[1:]
            for dup in duplicates:
                try:
                    file_size = os.path.getsize(dup)
                    os.remove(dup)
                    duplicate_count += 1
                    space_saved += file_size
                    print(f"{Fore.YELLOW}[-] Removed duplicate: {dup.name} (Size: {format_file_size(file_size)})")
                except Exception as e:
                    print(f"{Fore.RED}[ERROR] Failed to remove {dup}: {e}")
    
    if duplicate_count > 0:
        print(f"\n{Fore.GREEN}[✓] Removed {duplicate_count} duplicates, saved {format_file_size(space_saved)}")
    else:
        print(f"\n{Fore.GREEN}[✓] No duplicates found")
    
    return duplicate_count, space_saved