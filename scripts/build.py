"""Build the Chromium extension and store icon from the userscript source."""

import json
import math
import re
import struct
import zlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'bilibili-dynamic-watch-later.user.js'
DIST = ROOT / 'dist'


def icon_color(x, y):
    edge_x = max(abs(x - 64) - 44, 0)
    edge_y = max(abs(y - 64) - 44, 0)
    if math.hypot(edge_x, edge_y) > 16:
        return 0, 0, 0, 0

    radius = math.hypot(x - 64, y - 64)
    in_triangle = 52 <= x <= 80 and abs(y - 64) <= (80 - x) * 0.58
    if 31 <= radius <= 38 or in_triangle:
        return 255, 255, 255, 255
    return 32, 104 + round(y * 0.37), 185 + round(y * 0.24), 255


def png_icon(size):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))

    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            samples = [
                icon_color(64 + ((x + dx) * 128 / size - 64) * 1.25,
                           64 + ((y + dy) * 128 / size - 64) * 1.25)
                for dy in (0.25, 0.75) for dx in (0.25, 0.75)
            ]
            ink = [pixel for pixel in samples if pixel[3]]
            rgb = [round(sum(pixel[channel] for pixel in ink) / len(ink)) for channel in range(3)] if ink else [0, 0, 0]
            rows.extend((*rgb, round(len(ink) * 255 / len(samples))))

    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')


def build():
    header, source = SOURCE.read_text(encoding='utf-8').split('// ==/UserScript==', 1)
    metadata = {}
    for key, value in re.findall(r'^//\s+@(\S+)\s+(.+)$', header, re.MULTILINE):
        metadata.setdefault(key, []).append(value)

    name = metadata['name'][0]
    version = metadata['version'][0]
    script = source.lstrip().encode('utf-8')
    source_dir = ROOT / 'extension'
    files = {filename: (source_dir / filename).read_bytes() for filename in (
        'platform.js', 'popup.html', 'popup.css', 'popup.js',
    )}
    files['content.js'] = script
    files['LICENSE'] = (ROOT / 'LICENSE').read_bytes()
    icons = {str(size): f'icons/{size}.png' for size in (16, 32, 48, 128)}
    manifest = {
        'manifest_version': 3,
        'name': name,
        'version': version,
        'description': '自定义 B 站顶部状态栏。一键播放稍后再看播单，拖拽排序或隐藏顶栏图标。',
        'minimum_chrome_version': '123',
        'permissions': ['storage'],
        'icons': icons,
        'action': {'default_title': name, 'default_popup': 'popup.html', 'default_icon': icons},
        'content_scripts': [{
            'matches': metadata['match'],
            'js': ['platform.js', 'content.js'],
            'run_at': 'document_end',
        }],
    }
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    for size, path in icons.items():
        files[path] = png_icon(int(size))

    unpacked = DIST / 'extension'
    for name, data in files.items():
        path = unpacked / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    logo = DIST / 'store-logo-300.png'
    logo.write_bytes(png_icon(300))

    archive = DIST / f'bilibili-topbar-watch-later-{version}.zip'
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as package:
        for name, data in sorted(files.items()):
            package.writestr(name, data)
    print(archive)


if __name__ == '__main__':
    build()
