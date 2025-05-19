import os
import json
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / 'config.json'

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config_data = json.load(f)

DEFAULT_CATEGORIES = config_data['DEFAULT_CATEGORIES']

SETTINGS_PATH = os.environ.get('SETTINGS_PATH', 'settings.json')

def load_settings():
    if os.path.exists(SETTINGS_PATH):
        with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'categories': DEFAULT_CATEGORIES}
