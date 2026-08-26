"""Every place the site draws a logo, avatar or banner, and how it builds the URL.

Media URL handling had been copy-pasted rather than shared: sixteen private
copies of `getImageUrl`, a `buildAbsolute` of its own in the profile page, and
render sites using neither. They do not agree with each other - one appends the
path directly, another inserts a missing leading slash - so the same logo shows
in one place and breaks in another, which is exactly what was reported.

This lists each render site with:

  helper   the URL was passed through a normaliser
  raw      it was not, so a relative path from the API renders broken
  none     no image element at all, only initials or a placeholder

`none` is not always wrong - a card may be designed to show initials - but it is
wrong when the record has a logo and the card never looks at it, which is what
the home page's team cards were doing.
"""
import io
import pathlib
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = pathlib.Path('src')

IMG = re.compile(r'<(?:Image|img)\b((?:[^>]|\n)*?)/?>', re.S)
SRCATTR = re.compile(r'\bsrc\s*=\s*\{([^}]*)\}', re.S)
MEDIA = re.compile(r'logo|avatar|banner|picture|profile_pic|cover|image', re.I)
NORMALISER = re.compile(r'getImageUrl|buildAbsolute|mediaUrl|normalise\w*|absolute', re.I)

rows = []
for path in sorted(SRC.rglob('*.js')):
    src = path.read_text(encoding='utf-8')
    body = re.sub(r'^\s*//.*$', '', re.sub(r'/\*.*?\*/', '', src, flags=re.S), flags=re.M)
    for m in IMG.finditer(body):
        attrs = m.group(1)
        s = SRCATTR.search(attrs)
        if not s:
            continue
        expr = ' '.join(s.group(1).split())
        if not MEDIA.search(expr):
            continue
        kind = 'helper' if NORMALISER.search(expr) else 'raw'
        rows.append((path.as_posix(), body[:m.start()].count('\n') + 1, kind, expr[:64]))

raw = [r for r in rows if r[2] == 'raw']
helper = [r for r in rows if r[2] == 'helper']

print('=== media render sites: %d (%d normalised, %d raw) ===\n' % (len(rows), len(helper), len(raw)))
for path, line, kind, expr in raw:
    print('  raw     %s:%d  %s' % (path, line, expr))

copies = sorted({p.as_posix() for p in SRC.rglob('*.js')
                 if re.search(r'getImageUrl\s*=|buildAbsolute\s*=', p.read_text(encoding='utf-8'))})
print('\n=== private copies of a URL helper: %d ===' % len(copies))
for c in copies:
    print('  ' + c)

sys.exit(1 if (raw or len(copies) > 1) else 0)
