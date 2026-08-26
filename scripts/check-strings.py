"""Find user-facing English that never reaches the translator.

Two places a sentence hides from a translation pass:

1. **Text between tags.** `<p>Loading your draft</p>`. The obvious one, and the
   one a codemod catches.
2. **Text in an attribute.** `placeholder="Search"`, `aria-label="Close"`,
   `blurb="The store is still being built."`. These read as configuration
   rather than as copy, which is exactly why they survive a sweep and then sit
   in English on a French page for a year.

Two things keep the report honest rather than merely long:

**It only reads files a page can actually reach.** This repository carries
components from two earlier rebuilds that nothing imports any more. Reporting
their English would put fifty entries in front of somebody, none of which any
user will ever see, and the report would be ignored - which is worse than not
having one.

**It does not mistake JavaScript for prose.** `{x ? 'a' : 'b'}` puts fragments
like `: open ?` between a `>` and a `<`. Those are expressions, not copy.

Run from the frontend root. Non-zero exit when something is found.
"""
import io
import os
import pathlib
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = pathlib.Path('src')
APP = SRC / 'app'

COPY_ATTRS = (
    'placeholder', 'aria-label', 'ariaLabel', 'title', 'alt', 'label',
    'blurb', 'heading', 'subtitle', 'description', 'emptyText', 'helpText',
    'confirmLabel', 'cancelLabel', 'submitLabel',
)

ATTR = re.compile(r'\b(%s)\s*=\s*"([^"]{2,})"' % '|'.join(re.escape(a) for a in COPY_ATTRS))
# JSX text between two tags. Newlines are allowed inside, because the shape
# that hides the most English is a sentence given its own line:
#
#     <h4 className={styles.eyebrow}>
#       Event Creation & Ticketing
#     </h4>
#
# A single-line-only pattern reads straight past that, which is how eight
# landing-page sentences stayed in English through a whole translation pass.
JSXTEXT = re.compile(r'>([^<>{}]{3,}?)<', re.S)

# The third place English hides, and the one that hid longest: a string handed
# to a function. Error and toast messages are arguments, not markup and not
# attributes, so a sweep aimed at either reads straight past them.
#
# 136 of these shipped - `setError(data.message || 'Failed to load.')` - and
# every one showed English to a French reader at the exact moment something had
# gone wrong. Matched on the call rather than on the string, so a sentence only
# counts when it is going somewhere a person will read it.
MESSAGE_CALL = re.compile(r"""
    \b(?:setError|setSnackbarMessage|setNotice|setMessage|setStatusMessage
       |showToast|toast\.push|alert)\s*\(
    [^)]{0,200}?
    (['"])((?:[^'"\\]|\\.){4,}?)\1
""", re.X)
IMPORT = re.compile(r"""^\s*import\s+(?:[\w{}*,\s]+?\s+from\s+)?['"]([^'"]+)['"]""", re.M)
DYNAMIC = re.compile(r"""import\(\s*['"]([^'"]+)['"]\s*\)""")

NOT_PROSE = re.compile(r"""
    ^\s*$
  | ^[\W\d\s]+$
  | ^(https?:|/|\#|\.|@|\$)
  | ^\S+@\S+\.\S+$                  # an email address is the same in every language
  | ^[a-z0-9_-]+$
  | ^[A-Z0-9_]+$
""", re.X)

# The tail of a JavaScript expression, not a sentence somebody reads.
LOOKS_LIKE_CODE = re.compile(r"""
    ^\s*[:?=]                       # ': open ?', '= startDate && now'
  | [?:]\s*$                        # 'isMember ?'
  | ===|!==|&&|\|\|                 # operators
  | \w+\(                           # a call: new Date(u.date_joined)
  | ^\w+\.\w+$                      # a property read: l.price_vc
  | \.length\b
  | ;                               # a statement, never a sentence in JSX text
  | \breturn\b
  | \bcase\s+\d
  | \b(const|let|var)\b
""", re.X)

# Every English string the dictionary can translate, whichever way it is
# reached. `t('key', 'English')` and `tx('English')` both end here, and a
# component that translates its own props - ComingSoon does - means the caller
# passes plain English on purpose. Asking "is this string translatable" is the
# question that matters; asking "is it wrapped in a call" gets the wrong answer
# in both directions.
def dictionary_english():
    src = (SRC / 'i18n' / 'dictionaries.js').read_text(encoding='utf-8')
    en = src[src.index('  en: {'):]
    depth, end = 0, len(en)
    for i, ch in enumerate(en):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
    rows = re.finditer(r"""^\s*'[^']+':\s*'((?:[^'\\]|\\.)*)',\s*$""", en[:end], re.M)
    return {m.group(1).replace("\\'", "'").replace('\\\\', '\\') for m in rows}


TRANSLATABLE = dictionary_english()

ALLOW = {
    'V-ENT', 'VENT COINS', 'VENT COIN', 'VC', 'NGN', 'KYC', 'USDT', 'Paystack',
    'Google', 'Discord', 'Steam', 'Twitch', 'YouTube', 'Instagram', 'Facebook',
    'TikTok', 'Twitter', 'X (Twitter)', 'Bigo Live', 'PUBG', 'CODM', 'EAFC',
    'Free Fire', 'Counter Strike', 'Battle Royale', 'Anime', 'Manga', 'v-ent',
}


def strip_comments(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return re.sub(r'^\s*//.*$', '', src, flags=re.M)


CACHE = {}


def read(path):
    if path not in CACHE:
        CACHE[path] = strip_comments(path.read_text(encoding='utf-8'))
    return CACHE[path]


def resolve(spec, origin):
    if spec.startswith('@/images/') or spec.startswith('@/styles/'):
        return None
    if spec.startswith('@/'):
        base = SRC / spec[2:]
    elif spec.startswith('.'):
        base = (origin.parent / spec).resolve()
    else:
        return None
    for cand in (base.with_suffix('.js'), base / 'index.js', base):
        if cand.is_file() and cand.suffix == '.js':
            return pathlib.Path(os.path.relpath(cand.resolve(), pathlib.Path.cwd()))
    return None


def reachable():
    """Every file some page, layout or route can render."""
    seen = set()

    def walk(entry):
        if entry in seen or not entry.is_file():
            return
        seen.add(entry)
        for spec in list(IMPORT.findall(read(entry))) + list(DYNAMIC.findall(read(entry))):
            child = resolve(spec, entry)
            if child is not None:
                walk(child)

    for name in ('page.js', 'layout.js', 'error.js', 'loading.js', 'not-found.js',
                 'template.js', 'route.js', 'sitemap.js', 'robots.js'):
        for entry in APP.rglob(name):
            walk(entry)
    for entry in (SRC / 'middleware.js',):
        if entry.is_file():
            walk(entry)
    return seen


def interesting(text, kind):
    """Whether this string will actually reach a reader in English.

    `kind` matters. A prop may be translated by the component that receives it -
    ComingSoon translates its own title and blurb - so a prop whose English is in
    the dictionary is fine. A bare text node between two tags is never
    translated by anybody, whatever the dictionary happens to hold: the lookup
    only ever runs if some call site asks for it.

    Conflating the two was a real false negative. Eight landing-page sentences
    sat in the dictionary with French translations and rendered in English on
    /fr, because nothing ever called the translator on them, and this check
    said they were covered.
    """
    text = text.strip()
    if text in ALLOW or NOT_PROSE.match(text) or LOOKS_LIKE_CODE.search(text):
        return False
    if kind == 'attr' and text in TRANSLATABLE:
        return False
    return bool(re.search(r'[A-Za-z]{2,}', text))


def scan(path):
    src = read(path)
    out = []
    for m in ATTR.finditer(src):
        attr, text = m.group(1), m.group(2)
        if interesting(text, 'attr'):
            out.append((src[:m.start()].count('\n') + 1, '%s=' % attr, text))
    for m in MESSAGE_CALL.finditer(src):
        text = m.group(2)
        # A key passed to t() is not the string being shown; the fallback beside
        # it is, and that is caught as the second literal in the same call.
        if text.startswith(('api.', 'ui.', 'tip.')):
            continue
        if interesting(text, 'text'):
            out.append((src[:m.start()].count('\n') + 1, 'message', text))

    for m in JSXTEXT.finditer(src):
        text = m.group(1)
        if interesting(text, 'text'):
            out.append((src[:m.start()].count('\n') + 1, 'text', text.strip()))
    return out


def main():
    live = reachable()
    findings = []
    for path in sorted(live):
        if 'i18n' in path.parts:
            continue
        for line, kind, text in scan(path):
            findings.append((path.as_posix(), line, kind, text))

    for path, line, kind, text in findings:
        print('%s:%d  [%s] %s' % (path, line, kind, text[:100]))

    orphans = sorted(p for p in SRC.rglob('*.js') if p not in live and 'i18n' not in p.parts)
    print('\n%d untranslated strings across %d live files'
          % (len(findings), len(live)))
    print('%d .js files under src/ are not reachable from any page and were not read'
          % len(orphans))
    return 1 if findings else 0


if __name__ == '__main__':
    sys.exit(main())
