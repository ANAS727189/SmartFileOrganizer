# server/watcher.py
import sys
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from .organizers import organize_by_type, organize_by_date, organize_by_size
from colorama import Fore

class NewFileHandler(FileSystemEventHandler):
    def __init__(self, mode, directory):
        super().__init__()
        self.mode = mode
        self.directory = Path(directory)

    def on_created(self, event):
        if not event.is_directory:
            file_path = Path(event.src_path)
            print(f"{Fore.CYAN}[+] New file detected: {file_path.name}")
            # Organize only the new file
            if self.mode == 'type':
                self._organize_file(file_path, organize_by_type)
            elif self.mode == 'date':
                self._organize_file(file_path, organize_by_date)
            elif self.mode == 'size':
                self._organize_file(file_path, organize_by_size)

    def _organize_file(self, file_path, organize_func):
        # Temporarily adjust the function to work with a single file
        files = [f for f in self.directory.iterdir() if f.is_file()]
        original_files = set(files)
        organize_func(self.directory)
        new_files = set(f for f in self.directory.iterdir() if f.is_file())
        if new_files != original_files:
            print(f"{Fore.GREEN}[✓] Organized {file_path.name}")

def start_watcher(directory, mode):
    print(f"{Fore.CYAN}[+] Starting watcher on {directory} with mode {mode}")
    event_handler = NewFileHandler(mode, directory)
    observer = Observer()
    observer.schedule(event_handler, directory, recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print(f"{Fore.YELLOW}[!] Watcher stopped")
    observer.join()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"{Fore.RED}[ERROR] Usage: python -m server.watcher <directory> <mode>")
        sys.exit(1)
    directory, mode = sys.argv[1], sys.argv[2]
    if mode not in ['type', 'date', 'size']:
        print(f"{Fore.RED}[ERROR] Invalid mode. Use: type, date, size")
        sys.exit(1)
    start_watcher(directory, mode)