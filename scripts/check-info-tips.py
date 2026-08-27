# -*- coding: utf-8 -*-
"""Every info tip sits on the row of the label it explains.

A codemod had appended `<InfoTip/>` as the last child of `<label>`. Almost every
`.label` here is `display:flex; flex-direction:column`, so each child takes its
own row and the mark landed on a bare row under the input, below the error text.

The test is NOT "no tip is the last child of a label". Some labels are row-flex -
a checkbox row, an upload button, a toggle row - and a trailing tip on those is
already on the right line. Testing the proxy instead of the condition would
force churn on correct code, so the row-flex sites are listed with their reason,
in the same shape check-headings and check-media use.
"""
import io
import pathlib
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = pathlib.Path('src')

# A tip trailing a label is fine when the label lays its children out in a row.
#
# The two upload pills used to be listed here and are not any more: the CSS I
# read first was the create-EVENT copy of that stylesheet, and the tournament one
# sets `width: 100px`, so the tip inside wrapped the button onto two lines. The
# browser measurement caught what reading the wrong file had missed, and the tip
# now sits beside the button instead of inside it.
ALLOWED = {
    ('src/app/wallets/pin/page.js', 'showPin'):
        '.checkboxRow is display:flex, row: the tip is already on the line',
    ('src/app/wallets/withdraw/page.js', 'saveBank'):
        '.checkboxRow is display:flex, row: the tip is already on the line',
    ('src/components/create-tournament-component/basic-info/'
     'create-tournament-visibility/CreateTournamentVisibility.js', 'tournamentVisibility'):
        'inside a commented-out JSX block; never rendered',
}

TRAILING = re.compile(r'<InfoTip\b([^>]*)/>\s*</label>')
TIP_ID = re.compile(r'id=["\']([^"\']+)["\']')
# A control must never end up inside the label row: that would put the input
# itself on the label's line. The first version of the codemod did exactly this
# where a select sat inside a ternary, and it parsed perfectly.
ROW_WITH_CONTROL = re.compile(
    r'fieldLabelRow[^>]*>(?:(?!</span>).)*?<(?:input|select|textarea)\b', re.S)

unexpected = []
swallowed = []
wrapped = 0

for path in sorted(SRC.rglob('*.js')):
    text = path.read_text(encoding='utf-8')
    if '<InfoTip' not in text:
        continue
    posix = path.as_posix()
    wrapped += len(re.findall(r'fieldLabelRow', text))

    for m in TRAILING.finditer(text):
        tip_id = TIP_ID.search(m.group(1))
        key = (posix, tip_id.group(1) if tip_id else '?')
        if key in ALLOWED:
            continue
        line = text[:m.start()].count('\n') + 1
        unexpected.append('%s:%d  %s' % (posix, line, key[1]))

    for m in ROW_WITH_CONTROL.finditer(text):
        line = text[:m.start()].count('\n') + 1
        swallowed.append('%s:%d' % (posix, line))

print('=== tips wrapped onto a label row: %d ===' % wrapped)

print('\n=== trailing tips outside the documented row-flex list: %d ===' % len(unexpected))
for u in unexpected:
    print('  ' + u)

print('\n=== form controls swallowed into a label row: %d ===' % len(swallowed))
for s in swallowed:
    print('  ' + s)

sys.exit(1 if (unexpected or swallowed) else 0)
