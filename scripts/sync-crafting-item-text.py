"""Fetch Chinese game item descriptions corresponding to the pinned icon identities."""
from concurrent.futures import ThreadPoolExecutor
from html import unescape
import json
from pathlib import Path
import re
from urllib.parse import quote
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
icons = json.loads((root / 'src/config/crafting-icons.json').read_text('utf-8'))['icons']
bases = json.loads((root / 'src/config/poe2/base_items.json').read_text('utf-8'))

def clean(text):
    return unescape(re.sub('<[^>]+>', '', re.sub(r'<br\s*/?>', '\n', text))).strip()

def fetch(entry):
    key, icon = entry
    source = 'https://poe2db.tw/cn/' + quote(icon['name'].replace(' ', '_'))
    for attempt in range(3):
        try:
            html = urlopen(Request(source, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read().decode('utf-8')
            popup = html[html.index('newItemPopup'):].split('itemboximage')[0]
            descriptions = re.findall(r'<div class="explicitMod">(.*?)</div>', popup, re.S)
            directions = re.findall(r'<div class="default fst-italic">(.*?)</div>', popup, re.S)
            description = '\n'.join(clean(text) for text in descriptions)
            if not description:
                description = clean(re.search(r'<meta property="og:description" content="([^"]*)', html)[1])
            return key, {'description': description, 'directions': '\n'.join(clean(text) for text in directions), 'english': bases[icon['itemId']]['properties']['description'], 'source': source}
        except Exception:
            if attempt == 2:
                raise

with ThreadPoolExecutor(max_workers=6) as pool:
    text = dict(pool.map(fetch, icons.items()))
(root / 'src/config/crafting-item-text.json').write_text(json.dumps(text, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(f'Saved {len(text)} game item descriptions')
