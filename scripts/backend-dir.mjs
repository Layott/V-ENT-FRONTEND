// Which backend checkout a frontend catcher reads.
//
// Five catchers named their own list of sibling folders, and four put
// V-ENT-BACKEND-flw first: a worktree left on a docs branch. A backend change
// on a feature branch (a new wallet-history wording, 13 October 2026) was then
// judged against a tree that did not have it, and the catcher said "0 missing"
// about code it never read. Same fault as the commit hook on 9 October and the
// workspace tool forwarders on 29 September: a checker reading other code.
//
// The order, first that holds the file asked for:
//   1. VENT_BACKEND, which tools/check-all.py sets to the backend it judges;
//   2. the backend worktree on this frontend checkout's branch (feature/x
//      beside feature/x), as the commit hook pairs them;
//   3. the main checkout, V-ENT-BACKEND.
// scripts/check-backend-dir.mjs fails on a script that names a backend folder
// itself instead of asking here.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(HERE, '..');
const WORKSPACE = path.join(FRONTEND, '..');

function git(cwd, args) {
  try {
    const env = { ...process.env };
    // A hook exports these, and they point git at the repo being committed.
    delete env.GIT_DIR;
    delete env.GIT_WORK_TREE;
    delete env.GIT_INDEX_FILE;
    return execFileSync('git', ['-C', cwd, ...args], { env, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return '';
  }
}

function sameBranchWorktree() {
  const branch = git(FRONTEND, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (!branch || branch === 'HEAD') return null;
  const main = path.join(WORKSPACE, 'V-ENT-BACKEND');
  let dir = null;
  for (const line of git(main, ['worktree', 'list', '--porcelain']).split(/\r?\n/)) {
    if (line.startsWith('worktree ')) dir = line.slice(9).trim();
    else if (line.trim() === `branch refs/heads/${branch}`) return dir;
  }
  return null;
}

/** The backend folder holding `probe` (a path inside it), or null. */
export function backendDir(probe = 'manage.py') {
  const candidates = [
    process.env.VENT_BACKEND,
    sameBranchWorktree(),
    path.join(WORKSPACE, 'V-ENT-BACKEND'),
  ].filter(Boolean);
  return candidates.find((dir) => fs.existsSync(path.join(dir, probe))) || null;
}

/** A file inside the backend, or null when no backend has it. */
export function backendFile(relative) {
  const dir = backendDir(relative);
  return dir ? path.join(dir, relative) : null;
}
