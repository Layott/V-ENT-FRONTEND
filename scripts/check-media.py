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
NORMALISER = re.compile(
    r'getImageUrl|buildAbsolute|mediaUrl|mediaIn|pickMedia|teamLogo|avatarOf'
    r'|bannerOf|imagePlaceholder|normalise\w*|absolute', re.I)

# `import logoRed from '@/images/...'` - a bundled asset. next/image gets an
# object with { src, width, height }, never a path from the API.
IMPORTED = re.compile(r'^\s*import\s+(?:(\w+)|\{([^}]*)\})\s+from', re.M)
# `const [bannerPreview, setBannerPreview] = useState(...)` - a blob: URL from
# a file input, or a URL the person supplied. Also not an API path.
LOCAL_STATE = re.compile(r'const\s*\[\s*(\w+)\s*,')


def safe_roots(text):
    """Identifiers in this file that cannot be a relative API path."""
    names = set()
    for default, named in IMPORTED.findall(text):
        if default:
            names.add(default)
        for part in named.split(','):
            part = part.strip().split(' as ')[-1].strip()
            if part:
                names.add(part)
    names.update(LOCAL_STATE.findall(text))
    return names

# Render sites that read raw on purpose, with the reason. Keep this short: an
# allowlist is where a checker goes to die, so each entry states why the value
# cannot be a relative path from the API.
ALLOWED = {
    ('src/components/landing/landing-brands/LandingBrands.js', 'brandLogo.src'):
        'maps over a module-scope array of bundled imports; .src is the static '
        'asset object, not an API field',
}

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
        root = re.match(r'\s*(\w+)', expr)
        if NORMALISER.search(expr):
            kind = 'helper'
        elif root and root.group(1) in safe_roots(src):
            kind = 'helper'          # bundled asset or object URL
        else:
            kind = 'raw'
        if kind == 'raw' and (path.as_posix(), expr) in ALLOWED:
            kind = 'helper'
        rows.append((path.as_posix(), body[:m.start()].count('\n') + 1, kind, expr[:64]))

raw = [r for r in rows if r[2] == 'raw']
helper = [r for r in rows if r[2] == 'helper']

print('=== media render sites: %d (%d normalised, %d raw) ===\n' % (len(rows), len(helper), len(raw)))
for path, line, kind, expr in raw:
    print('  raw     %s:%d  %s' % (path, line, expr))

def builds_its_own_url(text):
    """A local helper that constructs a media URL instead of delegating.

    Read line by line rather than by one regex: the helper bodies vary in
    shape, and what matters is only whether an API base appears inside the few
    lines that follow the definition.
    """
    lines = text.split(chr(10))
    for i, line in enumerate(lines):
        if 'getImageUrl' not in line and 'buildAbsolute' not in line:
            continue
        if '=' not in line:
            continue
        for follow in lines[i:i + 8]:
            if any(name in follow for name in
                   ('NEXT_PUBLIC_API_URL', 'API_BASE', 'apiBase', 'baseUrl')):
                return True
    return False


copies = sorted({p.as_posix() for p in SRC.rglob('*.js')
                 if builds_its_own_url(p.read_text(encoding='utf-8'))})
print('\n=== private copies of a URL helper: %d ===' % len(copies))
for c in copies:
    print('  ' + c)

sys.exit(1 if (raw or copies) else 0)
