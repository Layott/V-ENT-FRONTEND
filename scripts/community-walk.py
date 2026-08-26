"""Walk every community module against a live V-ENT, and report what works.

Two accounts, because a direct message needs somebody to receive it. Everything
it creates is removed at the end, so a run leaves no litter on production.

    python community_walk.py https://api.v-ent.co
    python community_walk.py http://127.0.0.1:8000
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://api.v-ent.co').rstrip('/')

ACCOUNTS = [
    ('demo_temi', 'VentDemo2026!'),
    ('demo_zainab', 'VentDemo2026!'),
]

# Names have to differ between runs: a club name is unique.
STAMP = int(time.time())

results = []


def call(method, path, token=None, body=None):
    url = f'{BASE}{path}'
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            return res.status, json.loads(res.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw or '{}')
        except json.JSONDecodeError:
            return e.code, {'raw': raw[:200]}
    except Exception as exc:
        return 0, {'error': str(exc)}


def check(name, ok, detail=''):
    results.append((name, ok, detail))
    print(f'  {"pass" if ok else "FAIL"}  {name:44} {detail}')


def sign_in(username, password):
    code, body = call('POST', '/auth/login/',
                      body={'username_or_email': username, 'password': password})
    return body.get('session_token') if code == 200 else None


def main():
    print(f'Community walk against {BASE}\n')

    tokens = {}
    for username, password in ACCOUNTS:
        token = sign_in(username, password)
        tokens[username] = token
        check(f'sign in as {username}', bool(token))
    me, other = ACCOUNTS[0][0], ACCOUNTS[1][0]
    if not tokens.get(me) or not tokens.get(other):
        print('\nCannot continue without both accounts.')
        return 1

    a, b = tokens[me], tokens[other]
    created = {'posts': [], 'threads': [], 'clubs': [], 'scrims': []}

    # ---------------------------------------------------------------- feed
    code, body = call('GET', '/post/list/', a)
    check('feed loads', code == 200, f'{len(body.get("data", {}).get("posts", []))} posts')

    code, body = call('POST', '/post/create/', a, {'body': 'Walk check: a post from the audit.'})
    post_id = (body.get('data') or {}).get('post', {}).get('id')
    check('a post can be written', code in (200, 201) and bool(post_id), f'id {post_id}')
    if post_id:
        created['posts'].append(post_id)
        code, _ = call('POST', f'/post/{post_id}/like/', b)
        check('somebody else can like it', code == 200)
        code, body = call('POST', f'/post/{post_id}/comment/', b, {'body': 'And comment.'})
        check('somebody else can comment', code in (200, 201))
        code, body = call('GET', f'/post/{post_id}/', a)
        data = (body.get('data') or {}).get('post', {})
        check('likes and comments come back', code == 200,
              f'{data.get("like_count", 0)} likes, {len(data.get("comments", []))} comments')

    # ---------------------------------------------------------------- forums
    code, body = call('GET', '/thread/list/', a)
    check('forums load', code == 200,
          f'{len(body.get("data", {}).get("threads", []))} threads')

    code, body = call('POST', '/thread/create/', a,
                      {'title': f'Walk check thread {STAMP}',
                       'body': 'Started by the audit.'})
    thread_id = (body.get('data') or {}).get('thread', {}).get('id')
    check('a thread can be started', code in (200, 201) and bool(thread_id), f'id {thread_id}')
    if thread_id:
        created['threads'].append(thread_id)
        code, _ = call('POST', f'/thread/{thread_id}/reply/', b, {'body': 'A reply.'})
        check('somebody else can reply', code in (200, 201))
        code, _ = call('POST', f'/thread/{thread_id}/upvote/', b)
        check('a thread can be upvoted', code == 200)

    # ---------------------------------------------------------------- clubs
    code, body = call('GET', '/club/list/', a)
    check('clubs load', code == 200, f'{len(body.get("data", {}).get("clubs", []))} clubs')

    code, body = call('POST', '/club/create/', a,
                      {'name': f'Walk Check Club {STAMP}',
                       'description': 'Created by the audit.'})
    club_id = (body.get('data') or {}).get('club', {}).get('id')
    check('a club can be created', code in (200, 201) and bool(club_id), f'id {club_id}')
    if club_id:
        created['clubs'].append(club_id)
        code, _ = call('POST', f'/club/{club_id}/join/', b)
        check('somebody else can join it', code == 200)

    # ---------------------------------------------------------------- scrims
    code, body = call('GET', '/scrim/list/', a)
    check('scrims load', code == 200, f'{len(body.get("data", {}).get("scrims", []))} scrims')

    # ---------------------------------------------------------------- DMs
    code, body = call('GET', '/dm/list/', a)
    check('conversations load', code == 200,
          f'{len(body.get("data", {}).get("conversations", []))} conversations')

    # Starting a conversation is /dm/new/send/, which is what the app itself
    # posts to - there is no /dm/start/.
    code, body = call('POST', '/dm/new/send/', a,
                      {'username': other, 'body': 'Walk check: first message.'})
    convo_id = (body.get('data') or {}).get('conversation_id')
    check('a message can be started', code in (200, 201) and bool(convo_id), f'id {convo_id}')

    if convo_id:
        code, body = call('GET', f'/dm/{convo_id}/', b)
        messages = (body.get('data') or {}).get('messages', [])
        check('the other person receives it', code == 200 and len(messages) >= 1,
              f'{len(messages)} messages')

        code, _ = call('POST', f'/dm/{convo_id}/send/', b, {'body': 'And a reply back.'})
        check('they can reply', code in (200, 201))

        code, body = call('GET', f'/dm/{convo_id}/', a)
        messages = (body.get('data') or {}).get('messages', [])
        check('the reply arrives', code == 200 and len(messages) >= 2,
              f'{len(messages)} messages in the thread')

        code, body = call('GET', f'/dm/{convo_id}/', sign_in(*ACCOUNTS[0]) and a)
        # a third party must not be able to read it
        third = sign_in('demo_tobi', 'VentDemo2026!')
        if third:
            code, _ = call('GET', f'/dm/{convo_id}/', third)
            check('a stranger cannot read the conversation', code in (403, 404), f'HTTP {code}')

    # ---------------------------------------------------------------- cleanup
    print('\nCleaning up what this walk created...')
    for post_id in created['posts']:
        call('DELETE', f'/post/{post_id}/', a)
    for thread_id in created['threads']:
        call('DELETE', f'/thread/{thread_id}/', a)
    for club_id in created['clubs']:
        call('DELETE', f'/club/{club_id}/', a)

    passed = sum(1 for _, ok, _ in results if ok)
    print(f'\n{passed} of {len(results)} checks passed.')
    return 0 if passed == len(results) else 1


if __name__ == '__main__':
    sys.exit(main())
