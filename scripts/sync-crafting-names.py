"""Sync official Simplified/Traditional item names from the PoE2DB game tables."""
from concurrent.futures import ThreadPoolExecutor
from html import unescape
import json
from pathlib import Path
import re
import tempfile
from hashlib import sha256
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'src/config/crafting-data.json').read_text('utf-8'))
icons = json.loads((root / 'src/config/crafting-icons.json').read_text('utf-8'))['icons']
def fetch(path):
    cache = Path(tempfile.gettempdir()) / 'poe2-names-cache'
    cache.mkdir(exist_ok=True)
    cached = cache / (sha256(path.encode()).hexdigest() + '.html')
    if cached.exists(): return cached.read_text('utf-8')
    for attempt in range(3):
        try:
            html = urlopen(Request('https://poe2db.tw/' + path, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read().decode('utf-8')
            cached.write_text(html, 'utf-8')
            return html
        except HTTPError as error:
            if error.code == 404: return ''
            if attempt == 2: raise
        except Exception:
            if attempt == 2: raise

def category(task):
    locale, name = task
    html = fetch(locale + '/' + quote(name.replace(' ', '_')))
    links = re.findall(r'<a\b[^>]*class="whiteitem[^\"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>', html)
    return locale, {slug: unescape(text).strip() for slug, text in links}

tables = {'cn': {}, 'tw': {}}
with ThreadPoolExecutor(max_workers=6) as pool:
    for locale, names in pool.map(category, [(locale, name) for locale in tables for name in sorted({base['itemClass'] for base in data['bases']})]):
        tables[locale].update(names)

bases = {}
missing = []
for name in dict.fromkeys(base['name'] for base in data['bases']):
    slug = name.replace(' ', '_')
    if all(slug in tables[locale] for locale in tables):
        bases[name] = {locale: tables[locale][slug] for locale in tables}
    else: missing.append(name)

def item(task):
    locale, name = task
    html = fetch(locale + '/' + quote(name.replace(' ', '_')))
    match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    return locale, name, unescape(match[1]) if match else name

names = {'cn': {}, 'tw': {}}
with ThreadPoolExecutor(max_workers=6) as pool:
    for locale, name, translated in pool.map(item, [(locale, name) for locale in names for name in dict.fromkeys([icon['name'] for icon in icons.values()] + missing)]):
        names[locale][name] = translated
for name in missing:
    bases[name] = {locale: names[locale][name] for locale in names}
items = {key: {locale: names[locale][icon['name']] for locale in names} for key, icon in icons.items()}
(root / 'src/config/crafting-names.json').write_text(json.dumps({'source': 'https://poe2db.tw/', 'bases': bases, 'items': items}, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(f'Saved names for {len(bases)} equipment bases and {len(items)} consumables; {len(missing)} bases needed individual lookup')
