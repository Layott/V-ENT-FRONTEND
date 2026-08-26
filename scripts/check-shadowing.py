"""Catch a translator that has been shadowed by a variable of the same name.

The by-text translator was conventionally bound as `tx`. So is a transaction
row, in a codebase full of them:

    const tx = useTx();                       // the translator
    ...
    {transactions.map(tx => (                 // now tx is a transaction
      <p>{tx(tx.description)}</p>             // calls an object as a function
    ))}

That is a TypeError at render, not a lint warning, and it takes the whole page
to the error screen. It shipped on two pages - the signed-in home dashboard and
the wallet transaction table - because both read fine line by line and the
crash only happens on a row that reaches that branch.

The check is deliberately simple: if a file binds a translator to a name, and
somewhere else declares a parameter or variable with that same name, the
binding is shadowed and must be renamed. There is no legitimate reason to
reuse the name, so this has no exceptions.
"""
import io
import pathlib
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = pathlib.Path('src')

BINDING = re.compile(r'\bconst\s+(\w+)\s*=\s*(useTx|useT)\(\)')


def shadows(src, name):
    """Places that redeclare `name` as something other than the translator."""
    hits = []
    patterns = (
        (r'\b%s\s*=>' % re.escape(name), 'arrow parameter'),
        # A parameter list, not a call. `apiMessage(tt, data, ...)` passes the
        # translator as an argument, which is the opposite of shadowing it, and
        # matching that produced 184 false positives the moment apiMessage was
        # wired up. A call has an identifier immediately before the paren; a
        # parameter list does not.
        (r'(?<![\w$])\(\s*%s\s*[,)]' % re.escape(name), 'function parameter'),
        (r'\bfor\s*\(\s*(?:const|let|var)\s+%s\b' % re.escape(name), 'loop variable'),
        (r'\b(?:const|let|var)\s+%s\s*=(?!\s*use(?:T|Tx)\(\))' % re.escape(name), 'redeclared'),
    )
    for pattern, why in patterns:
        for m in re.finditer(pattern, src):
            hits.append((src[:m.start()].count('\n') + 1, why,
                         ' '.join(src[m.start():m.start() + 70].split())))
    return hits


findings = []
dead = []
for path in sorted(SRC.rglob('*.js')):
    src = path.read_text(encoding='utf-8')
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    src = re.sub(r'^\s*//.*$', '', src, flags=re.M)
    for m in BINDING.finditer(src):
        name = m.group(1)

        # Is it ever actually called? The codemod that introduced translators
        # left a dead `const t = useT()` in a lot of files. A dead binding that
        # happens to share a name with a loop variable is untidy, not a crash,
        # and mixing the two in one list buries the crashes.
        called = re.search(r'[^\w.]%s\(' % re.escape(name), src)
        hits = shadows(src, name)
        if not called:
            if hits:
                dead.append((path.as_posix(), name))
            continue
        for line, why, snippet in hits:
            findings.append((path.as_posix(), name, line, why, snippet))

for path, name, line, why, snippet in findings:
    print('%s:%d  `%s` is called as a translator AND shadowed as a %s:  %s'
          % (path, line, name, why, snippet))

print('\n%d shadowed translator bindings that are actually called' % len(findings))
print('%d dead bindings shadowed but never called (untidy, not a crash)' % len(dead))
if '-v' in sys.argv:
    for path, name in dead:
        print('    %s  `%s`' % (path, name))
sys.exit(1 if findings else 0)
