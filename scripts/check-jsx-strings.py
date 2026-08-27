# -*- coding: utf-8 -*-
"""User-visible string literals rendered from inside a JSX expression container.

The string sweep reads JSX *text* and copy attributes, so `{owned ? 'Manage' :
...}` was invisible to it - a literal inside braces is neither. That is a fourth
category, and "Manage" was sitting in English on a fully French teams page.

Two things are NOT this, and the first version of this scan got both wrong:

  the English fallback in `tt('ui.x', 'Audit Log')`   it is the in-code default,
      and the dictionary carries the translation. Checking only whether the
      literal directly follows `tt(` flagged every second argument in the repo.
  a module-scope config array                        that is what `tx()` is for,
      and it is translated where it renders: `{tx(tab.label)}`.

So the test is what survives after every translator call is removed.
"""
import pathlib
import re
import sys

SRC = pathlib.Path('src')

# A JSX expression container that is the child of a tag, so attributes are out
# of scope. Allows one level of nested braces.
CONTAINER = re.compile(r'>\s*(\{(?:[^{}]|\{[^{}]*\})*\})\s*<', re.S)

# A whole translator call, including its arguments and one nested call level.
CALL = re.compile(r'\b(?:tx|tt|apiMessage|t)\s*\((?:[^()]|\([^()]*\))*\)')

LITERAL = re.compile(r"""(?<![\w.])(['"])([A-Za-z][^'"]{1,60})\1""")

hits = []
# JSX comments - {/* ... */} - are not rendered, so their text is not copy. The
# scanner was reporting an explanation written above the heading it describes.
JSX_COMMENT = re.compile(r'\{\s*/\*.*?\*/\s*\}', re.S)


for path in sorted(SRC.rglob('*.js')):
    if 'i18n' in path.as_posix():
        continue
    text = path.read_text(encoding='utf-8')
    text = JSX_COMMENT.sub(lambda m: ' ' * len(m.group(0)), text)
    for c in CONTAINER.finditer(text):
        expr = c.group(1)
        # Blank out translator calls, keeping length so offsets stay usable.
        stripped = CALL.sub(lambda m: ' ' * len(m.group(0)), expr)
        for m in LITERAL.finditer(stripped):
            literal = m.group(2)
            if re.fullmatch(r'[a-z0-9_.-]+', literal):
                continue                      # a key or a css class
            if re.fullmatch(r'[A-Z0-9_ ]+', literal):
                continue                      # an enum value
            if '/' in literal or literal.startswith('http'):
                continue
            if not re.search(r'[a-z]', literal):
                continue
            line = text[:c.start() + m.start()].count('\n') + 1
            hits.append((path.as_posix(), line, literal))

print('%d literals rendered without a translator' % len(hits))
for f, l, t in hits:
    print('  %s:%d  %r' % (f, l, t))

# Roughly a sixth of these are not copy at all - svg path data, a css class
# string, 'en-GB' handed to toLocaleDateString, a rel attribute. They are listed
# rather than filtered because guessing wrong in that direction hides a real one.
sys.exit(1 if hits else 0)
