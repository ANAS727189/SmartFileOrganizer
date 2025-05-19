import argparse
import time
import sys
from datetime import datetime
from colorama import init, Fore, Style
from .ui import print_header
from .utils import format_file_size
from .duplicate_remover import remove_duplicates
from .organizers import organize_by_type, organize_by_date, organize_by_size
import os
import json
from pathlib import Path

init(autoreset=True)

def main():
    parser = argparse.ArgumentParser(
        description="Terminal File Organizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example usage:\n  python -m file_organizer ~/Downloads --mode type --remove-duplicates"
    )
    parser.add_argument("path", help="Path to the directory to organize")
    parser.add_argument("--mode", choices=['type', 'date', 'size'], default='type', 
                        help="Organizing mode (type, date, or size)")
    parser.add_argument("--remove-duplicates", action="store_true", 
                        help="Remove duplicate files before organizing")
    args = parser.parse_args()

    path = args.path
    mode = args.mode

    if not os.path.exists(path):
        print(f"{Fore.RED}[ERROR] The path '{path}' does not exist!")
        return

    print_header()

    print(f"{Fore.WHITE}Directory: {Fore.GREEN}{path}")
    print(f"{Fore.WHITE}Mode: {Fore.GREEN}{mode}")
    print(f"{Fore.WHITE}Remove Duplicates: {Fore.GREEN}{args.remove_duplicates}")
    print()

    start_time = time.time()
    stats = {'files_organized': 0, 'duplicates_removed': 0, 'space_saved': 0, 'time_taken': 0}
    duplicate_count = 0
    space_saved = 0
    files_before = len([f for f in Path(path).iterdir() if f.is_file()])


    if args.remove_duplicates:
        duplicate_count, space_saved = remove_duplicates(path)
        stats['duplicates_removed'], stats['space_saved'] = remove_duplicates(path)

    if mode == "type":
        organize_by_type(path)
    elif mode == "date":
        organize_by_date(path)
    elif mode == "size":
        organize_by_size(path)

    elapsed_time = time.time() - start_time
    files_after = len([f for f in Path(path).iterdir() if f.is_file()])
    stats['files_organized'] = files_before - files_after
    stats['time_taken'] = elapsed_time

    print(json.dumps(stats))

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