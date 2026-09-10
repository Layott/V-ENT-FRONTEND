// Whether THIS instance can actually serve.
//
// CEO, 7 September 2026: "is it possible for the site to update while people
// are still using it? and they dont even know what was happening."
//
// Two Next instances now sit behind nginx and are restarted one at a time. The
// only thing that makes that safe is being able to ask an instance "are you
// ready" and get an honest answer, because a process that has started is not
// the same as a process that can serve: node is up for a second or two before
// the server is listening and the first render has compiled.
//
// So the deploy waits for THIS to answer 200 on the instance it just restarted
// before it touches the other one. Without it, restarting both in sequence can
// still take the site down, because the second restart begins while the first
// instance is still warming.
//
// Deliberately minimal. It does NOT check the database or the API: this answers
// "can this node process serve a page", which is the only question the deploy
// is asking. A health check that fails when a dependency is slow takes the site
// down to report that something else is unwell.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Which build this process is actually serving, read off disk once.
//
// It used to come from `process.env.NEXT_BUILD_ID`, which nothing sets, so
// every instance answered `"build": "unknown"` and the one thing this endpoint
// existed to make visible was invisible. On 10 September a deploy built a new
// frontend, failed to roll the instances, and left the site serving the
// previous build for twenty minutes with every check saying active and
// healthy. The build id is what makes that a one-line question.
//
// Read at module load, not per request: it cannot change without the process
// being replaced, which is the whole point of comparing it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = (() => {
  for (const path of ['.next/BUILD_ID', join(process.cwd(), '.next/BUILD_ID')]) {
    try {
      const id = readFileSync(path, 'utf8').trim();
      if (id) return id;
    } catch {
      // Next dev has no BUILD_ID file. Fall through to the env vars.
    }
  }
  return process.env.NEXT_BUILD_ID || process.env.BUILD_ID || 'unknown';
})();

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      // Which instance answered. Two are running and they are otherwise
      // identical, so without this there is no way to tell whether the one you
      // just restarted is the one that replied.
      port: process.env.PORT || 'unknown',
      // Which build. After a deploy the two briefly differ, and that is the
      // fastest way to see the rollout is only half done.
      build: BUILD,
      uptime: Math.round(process.uptime()),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // Never cached, by anything. A cached health check is not a health
        // check: nginx would keep reporting an instance healthy for the whole
        // window in which it was not.
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
