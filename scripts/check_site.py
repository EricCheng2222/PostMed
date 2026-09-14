#!/usr/bin/env python3
"""Validate the static site, question banks, anchors and JavaScript syntax."""
import json
import subprocess
import tempfile
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.links, self.scripts, self.banks = path, set(), [], [], []
        self.active = None
        self.errors = []
        self.quiz_count = 0
        self.feed(path.read_text())
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            if attrs['id'] in self.ids:
                self.errors.append('duplicate id: ' + attrs['id'])
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attrs.get(attr): self.links.append(attrs[attr])
        if tag == 'script' and 'src' not in attrs:
            self.active = [attrs.get('type', ''), attrs.get('id', ''), '']
        if 'data-quiz' in attrs: self.quiz_count += 1
    def handle_data(self, data):
        if self.active is not None: self.active[2] += data
    def handle_endtag(self, tag):
        if tag == 'script' and self.active is not None:
            kind, name, source = self.active
            if kind == 'application/json':
                try:
                    items = json.loads(source)
                    if name.startswith('quiz'):
                        assert isinstance(items, list) and items
                        for item in items:
                            assert isinstance(item['stem'], str) and item['stem']
                            assert isinstance(item['options'], list) and len(item['options']) >= 2
                            assert type(item['answer']) is int and 0 <= item['answer'] < len(item['options'])
                            assert isinstance(item['explain'], str) and item['explain']
                        self.banks.append(items)
                except (ValueError, AssertionError, KeyError, TypeError) as error:
                    self.errors.append('invalid question bank ' + name + ': ' + str(error))
            elif kind in ('', 'text/javascript', 'module') and source.strip(): self.scripts.append(source)
            self.active = None

def check():
    pages = {path.resolve(): Page(path) for path in [ROOT / 'index.html', *sorted((ROOT / 'pages').glob('*.html'))]}
    errors = []
    scripts = []
    for path, page in pages.items():
        errors.extend(f'{path.relative_to(ROOT)}: {error}' for error in page.errors)
        for link in page.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc: continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if not target.exists(): errors.append(f'{path.relative_to(ROOT)}: missing target {link}')
            elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:
                errors.append(f'{path.relative_to(ROOT)}: missing anchor {link}')
        source = path.read_text()
        if 'assets/js/site.js' in source:
            assert source.index('assets/js/study.js') < source.index('assets/js/site.js'), path
        scripts.extend((str(path.relative_to(ROOT)), script) for script in page.scripts)
    with tempfile.TemporaryDirectory(prefix='postmed-check-') as directory:
        for index, (name, source) in enumerate(scripts):
            path = Path(directory) / f'{index}.js'
            path.write_text(source)
            result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
            if result.returncode: errors.append(name + ': ' + result.stderr)
    for path in (ROOT / 'assets/js').glob('*.js'):
        result = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True)
        if result.returncode: errors.append(str(path.relative_to(ROOT)) + ': ' + result.stderr)
    # Catalog metadata and its no-JS links must cover every authored lesson.
    catalog = json.loads((ROOT / 'assets/js/catalog.js').read_text().split('window.POSTMED_LESSONS = ', 1)[1].rstrip(';\n'))
    assert len(catalog) == 41
    assert len([entry for entry in catalog if entry['number']]) == 39
    for entry in catalog:
        page = pages[(ROOT / entry['href']).resolve()]
        assert entry['questions'] == sum(map(len, page.banks)), entry['id']
        assert entry['href'] in pages[(ROOT / 'index.html').resolve()].links, entry['id']
        for section in entry['sections']: assert section['id'] in page.ids, entry['id']
    if errors:
        print('\n'.join(errors))
        raise SystemExit(f'{len(errors)} validation errors')
    print(f'Checked {len(pages)} pages, {len(scripts)} inline scripts, {sum(sum(map(len,p.banks)) for p in pages.values())} questions and all local links/anchors.')

if __name__ == '__main__': check()
