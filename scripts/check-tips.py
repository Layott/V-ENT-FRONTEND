"""How much of the interface actually carries an info tip.

The gate says every option, button and control has one. That claim is easy to
make and hard to check, so this counts rather than asserts.

What counts as a control needing an explanation: a form field the person has to
decide something about - a select, a checkbox, a radio, a number, a date, a
text input - and a button that does something consequential rather than moving
between steps. What does not: a search box, a cancel button, a tab, a link, a
close X. Explaining those is noise, and noise is how people learn to ignore the
mark entirely.

A field is covered when an InfoTip appears within a few lines of it, which is
the same block in every layout this codebase uses.
"""
import io
import os
import pathlib
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = pathlib.Path('src')
APP = SRC / 'app'

IMPORT = re.compile(r"""^\s*import\s+(?:[\w{}*,\s]+?\s+from\s+)?['"]([^'"]+)['"]""", re.M)
FIELD = re.compile(r'<(select|textarea)\b|<input\b([^>]*)', re.I)
TYPE = re.compile(r'type\s*=\s*["\']?(\w+)')
TIP = re.compile(r'<InfoTip\b')

# Controls nobody needs an explanation for.
SKIP_TYPES = {'hidden', 'submit', 'button', 'search', 'image', 'reset'}
SKIP_NAME = re.compile(r'search|filter|query', re.I)

# Whole surfaces that get no info tips on purpose, and why. A mark that
# explains its own label is not thoroughness; it is noise, and noise is how
# people learn to stop pressing the mark on the fields that do need one.
#
# Listed rather than silently skipped so the decision can be argued with.
EXCLUDED = {
    'src/app/login/page.js': 'identity fields: email and password explain themselves',
    'src/app/signup/page.js': 'identity fields on sign-up',
    'src/app/(admin)/admin/login/page.js': 'identity fields on the admin sign-in',
    'src/app/reset-password/page.js': 'a password and its confirmation',
    'src/app/reset-email/page.js': 'one email field',
    'src/app/forgot-password/page.js': 'one email field',
    'src/app/claim/[token]/page.js': 'setting a first password',
    'src/app/verify-email/page.js': 'a verification code',
    'src/app/email-verified/[key]/[value]/page.js': 'nothing to decide',
    'src/app/onboarding/page.js': 'a guided flow that explains each step as it goes',
    'src/app/community/page.js': 'compose boxes; the placeholder is the explanation',
    'src/app/tournaments/page.js': 'list filters, not settings',
    'src/app/events/page.js': 'list filters, not settings',
    'src/app/search/page.js': 'search and its filters',
    'src/app/rankings/RankingsView.js': 'list filters',
    'src/components/landing/join-thousands-gamers/JoinThousandsGamers.js': 'a marketing email capture',
}

WINDOW = 6   # lines either side: the same label/field block in every layout here


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
    seen = set()

    def walk(entry):
        if entry in seen or not entry.is_file():
            return
        seen.add(entry)
        for spec in IMPORT.findall(read(entry)):
            child = resolve(spec, entry)
            if child is not None:
                walk(child)

    for name in ('page.js', 'layout.js'):
        for entry in APP.rglob(name):
            walk(entry)
    return seen


GROUP_HEADING = re.compile(
    r'<h[2-5]\b[^>]*(?:cardTitle|groupTitle|sectionTitle|panelTitle|stepTitle|sectionHeading)[^>]*>')


def audit(path):
    src = read(path)
    lines = src.split('\n')
    tip_lines = {src[:m.start()].count('\n') for m in TIP.finditer(src)}

    # A group of toggles under one heading is explained once, on the heading.
    # Repeating the same sentence on each of five checkboxes is not thorough,
    # it is noise, and it is how people learn to ignore the mark. So a control
    # is covered when the nearest heading above it carries a tip.
    headings = []
    for m in GROUP_HEADING.finditer(src):
        line = src[:m.start()].count('\n')
        close = src.find('</h', m.end())
        headings.append((line, 'InfoTip' in src[m.end():close if close != -1 else m.end()]))
    headings.sort()

    def group_covered(line):
        best = None
        for hline, has_tip in headings:
            if hline <= line:
                best = has_tip
            else:
                break
        return bool(best)

    covered, bare = 0, []
    for m in FIELD.finditer(src):
        attrs = m.group(2) or ''
        kind = (TYPE.search(attrs).group(1).lower() if TYPE.search(attrs) else
                (m.group(1) or 'input').lower())
        if kind in SKIP_TYPES:
            continue
        line = src[:m.start()].count('\n')
        context = '\n'.join(lines[max(0, line - 2):line + 2])
        if SKIP_NAME.search(context):
            continue
        if any(abs(line - tl) <= WINDOW for tl in tip_lines) or group_covered(line):
            covered += 1
        else:
            bare.append((line + 1, ' '.join(lines[line].split())[:88]))
    return covered, bare


def main():
    live = sorted(reachable())
    total_covered, total_bare, excluded = 0, 0, 0
    rows = []
    for path in live:
        covered, bare = audit(path)
        if not covered and not bare:
            continue
        if path.as_posix() in EXCLUDED:
            excluded += len(bare)
            total_covered += covered
            continue
        total_covered += covered
        total_bare += len(bare)
        rows.append((path, covered, bare))

    verbose = '-v' in sys.argv
    for path, covered, bare in sorted(rows, key=lambda r: -len(r[2])):
        if not bare:
            continue
        print('%s  %d covered, %d without' % (path.as_posix(), covered, len(bare)))
        if verbose:
            for line, text in bare:
                print('      %d: %s' % (line, text))

    total = total_covered + total_bare
    pct = (100.0 * total_covered / total) if total else 100.0
    print('\n%d decision-carrying controls in live files' % total)
    print('%d have an info tip within %d lines (%.0f%%)' % (total_covered, WINDOW, pct))
    print('%d do not' % total_bare)
    print('%d more are on surfaces excluded on purpose (see EXCLUDED, with reasons)' % excluded)
    return 0


if __name__ == '__main__':
    sys.exit(main())
