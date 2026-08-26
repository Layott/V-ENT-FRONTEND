"""R8: one h1 per page, headings in order, and alt text that states a fact.

Reads the JSX rather than the rendered page on purpose. A rendered check only
sees the branch that happened to render - the loading state, or the empty one -
and the heading that is wrong is usually in the branch nobody looked at.

It follows local imports, because on this codebase the h1 is almost never in
page.js; it is inside the component the page renders. A checker that stops at
page.js reports sixty-five faults that are not faults, which is worse than no
checker at all - it trains you to ignore it.

Three faults, in the order they matter:

1. **No h1 anywhere in the tree, or two.** A page with no h1 has no name to any
   reader working from structure, which now includes the models people ask
   instead of typing a query. Two h1s means neither is the name.
2. **A level skipped inside one file.** Across files the order depends on
   render order, which this cannot see, so it is only checked within a file.
3. **Alt text that is not a fact.** Empty alt on a real image, alt repeating
   the filename, or alt beginning "image of".
"""
import os
import pathlib
import re

SRC = pathlib.Path('src')
APP = SRC / 'app'

HEADING = re.compile(r'<h([1-6])[\s>]')
IMG = re.compile(r'<(Image|img)\b((?:[^>]|\n)*?)/?>', re.S)
ALT = re.compile(r'\balt\s*=\s*(\{[^}]*\}|"[^"]*"|\'[^\']*\')', re.S)
SRCATTR = re.compile(r'\bsrc\s*=\s*(\{[^}]*\}|"[^"]*"|\'[^\']*\')', re.S)
IMPORT = re.compile(r"""^\s*import\s+(?:[\w{}*,\s]+?\s+from\s+)?['"]([^'"]+)['"]""", re.M)
DYNAMIC = re.compile(r"""import\(\s*['"]([^'"]+)['"]\s*\)""")

JUNK_ALT = re.compile(r'^(image|img|photo|picture|icon|logo|banner|avatar|thumbnail)?$', re.I)
PREFIXED = re.compile(r'^\s*(image of|picture of|photo of|graphic of)\b', re.I)


# Pages whose source holds several h1 elements that can never be on screen
# together: an early return, a success state that replaces the form, or one
# step of a wizard. Static reading cannot tell those from a page with two
# titles, so each is listed with the reason it is allowed, and anything not
# on this list is reported.
BRANCHED = {
    'auth/external': 2,                     # signing you in / it did not work
    'claim/[token]': 2,                     # claim your account / link expired
    'email-verified/[key]/[value]': 2,      # verified / link expired
    'events/create-event': 2,               # the wizard / event published
    'onboarding': 5,                        # one wizard step at a time
    'organizations/manage': 2,              # manage / owner-only refusal
    'organizations/[slug]/manage': 2,       # the same page addressed by slug
    'partners/authorize': 3,                # sign in / invalid request / consent
    'settings': 2,                          # the mobile and desktop layouts
    'tournaments/manage': 2,                # the tournament / cannot open it
    'wallets/withdraw': 2,                  # the form / the confirmation
}


def strip_comments(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return re.sub(r'^\s*//.*$', '', src, flags=re.M)


def resolve(spec, origin):
    """A local import to a file on disk, or None for a package or an asset."""
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
            # Same file reached two ways is one file. Without this the report
            # lists everything twice and reads as twice the problem.
            return pathlib.Path(os.path.relpath(cand.resolve(), pathlib.Path.cwd()))
    return None


CACHE = {}


def read(path):
    if path not in CACHE:
        CACHE[path] = strip_comments(path.read_text(encoding='utf-8'))
    return CACHE[path]


def tree(entry, seen=None):
    """Every local .js file this page can render, itself included."""
    seen = seen if seen is not None else set()
    if entry in seen or not entry.is_file():
        return seen
    seen.add(entry)
    body = read(entry)
    for spec in list(IMPORT.findall(body)) + list(DYNAMIC.findall(body)):
        child = resolve(spec, entry)
        if child is not None:
            tree(child, seen)
    return seen


def headings(path):
    return [int(m.group(1)) for m in HEADING.finditer(read(path))]


def alt_faults(path):
    out = []
    for m in IMG.finditer(read(path)):
        attrs = m.group(2)
        alt = ALT.search(attrs)
        s = SRCATTR.search(attrs)
        where = (s.group(1)[:44] if s else '?')
        if alt is None:
            out.append('NO ALT on %s' % where)
            continue
        raw = alt.group(1)
        if raw.startswith('{'):
            continue
        text = raw[1:-1]
        if text == '':
            # An empty alt is right for decoration, and wrong for anything
            # else. aria-hidden is what separates "decided" from "forgot", and
            # it is the only thing that can: both look identical otherwise.
            if 'aria-hidden' not in attrs:
                out.append('EMPTY ALT on %s' % where)
        elif JUNK_ALT.match(text.strip()):
            out.append('JUNK ALT %r on %s' % (text, where))
        elif PREFIXED.match(text):
            out.append('PREFIXED ALT %r' % text)
    return out


def order_faults(path):
    seen = 0
    for lv in headings(path):
        if seen and lv > seen + 1:
            return ['h%d follows h%d' % (lv, seen)]
        seen = lv
    return []


def main():
    pages = sorted(APP.rglob('page.js'))
    noh1, many, order, alts = [], [], [], []

    for page in pages:
        files = tree(page)
        ones = sum(headings(f).count(1) for f in files)
        label = page.relative_to(APP).as_posix()[:-8] or '/'
        if ones == 0:
            noh1.append(label)
        elif ones > 1 and BRANCHED.get(label) != ones:
            expected = BRANCHED.get(label)
            note = ' (allowed %d)' % expected if expected else ''
            many.append('%s (%d)%s' % (label, ones, note))
        for f in sorted(files):
            for x in order_faults(f):
                order.append('%s  <- %s' % (x, f.as_posix()))
            for x in alt_faults(f):
                alts.append('%s  <- %s' % (x, f.as_posix()))

    order = sorted(set(order))
    alts = sorted(set(alts))

    print('=== %d pages ===' % len(pages))
    print('\n-- no h1 anywhere (%d)' % len(noh1))
    for x in noh1:
        print('   ', x)
    print('\n-- more than one h1, beyond the known branches (%d)' % len(many))
    for x in many:
        print('   ', x)
    print('\n-- heading level skipped within a file (%d)' % len(order))
    for x in order:
        print('   ', x)
    print('\n-- alt text (%d)' % len(alts))
    for x in alts:
        print('   ', x)


if __name__ == '__main__':
    raise SystemExit(main())
