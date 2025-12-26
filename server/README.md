# Remote Highscores (Server)

This folder contains a minimal Cloudflare Worker for the Iron Spine highscore API.

## What you get
- `GET /api/highscores?limit=10` returns `{ entries: [...] }`
- `POST /api/highscores` upserts by name (case-insensitive)
- Anonymous, arcade-style (no auth)
- Optional CORS allowlist

## Deploy (Cloudflare Worker, no code changes needed)

1. Create a KV namespace named `IRONSPINE_HIGHSCORES`.
2. Create a Worker and bind the KV namespace as `HIGHSCORES`.
3. Paste `server/highscores-worker.js` into the Worker editor.
4. (Optional) Set env vars:
   - `ALLOWED_ORIGINS`: comma-separated origins (ex: `https://xxgeminixx.github.io`)
   - `STRICT_ORIGIN`: set to `1` to hard-block other origins
   - `MAX_ENTRIES`: max entries returned (default 50)
   - `STORE_LIMIT`: max entries stored (default 200)
   - `MAX_NAME_LENGTH`: max name length (default 25)
5. Add a route for `/api/highscores` or use the Worker URL directly.

## Connect the game

Update `REMOTE_HIGHSCORE.endpoint` in `src/config.js` to your Worker URL:

```
endpoint: 'https://your-worker.your-subdomain.workers.dev/api/highscores'
```

For quick overrides without code changes, add:

```
window.IRON_SPINE_HIGHSCORES = {
  allowAnyHost: true,
  endpoint: 'https://your-worker.your-subdomain.workers.dev/api/highscores'
};
```

## Local testing (optional)

Use the Worker preview in Cloudflare or deploy to a dev subdomain.
The game only submits highscores on the official host unless you enable
`allowAnyHost` or the `ironspine_highscores_override` localStorage flag.

Example local override:
```
localStorage.setItem('ironspine_highscores_override', '1');
```
