# 🦫 COCONUT DOGGY: SWARM — camieo.com

Brainrot capybara arcade game platform. SWARM shooter × Snake chain × Meme energy.

## Architecture

```
camieo/
├── docker-compose.yml    ← Coolify picks this up
├── .env.example          ← Copy to .env, set your passwords
├── app/
│   ├── Dockerfile        ← Node 20 Alpine
│   ├── package.json      ← Express + mysql2 + cors
│   ├── server.js         ← API + static serving
│   └── public/
│       └── index.html    ← The game (standalone React)
└── sql/
    └── init.sql          ← One table, auto-runs on first boot
```

## MySQL Schema

One table. Two core columns. That's it.

| Column       | Type        | Purpose                     |
|------------- |------------ |---------------------------- |
| masked_name  | VARCHAR(64) | IP hashed into a fun name   |
| score        | INT         | High score                  |

(+ wave, chain, meme_rank, game, created_at for flavor)

## IP Masking

Player IPs are SHA-256 hashed with a salt, then mapped to a generated name like:

- `ChillCapybara_7F`
- `ZenCoconut_A3`
- `UnbotheredNoodle_B9`
- `CosmicPretzel_4E`

No raw IPs stored. Ever.

## Coolify Deploy

1. Push this repo to GitHub/GitLab
2. In Coolify: **New Resource → Docker Compose**
3. Point to your repo
4. Set environment variables (or Coolify will use .env defaults):
   - `DB_PASS` — change from default
   - `DB_ROOT_PASS` — change from default
   - `API_URL` — set to `https://camieo.com` (or leave blank)
5. Deploy. Coolify handles SSL + reverse proxy to port 3000.

### Coolify Domain Config

In Coolify's service settings for `app`:
- **Domains**: `camieo.com`
- **Port**: `3000`

MySQL stays internal (no exposed port).

## Local Dev

```bash
cp .env.example .env
docker compose up --build
# → http://localhost:3000
```

## API Endpoints

```
GET  /api/health                → { status: "ok", vibe: "unbothered" }
POST /api/scores                → Submit score (auto-masks IP)
GET  /api/scores/:game?limit=N  → Leaderboard + your personal best
```

### Submit Score

```json
POST /api/scores
{
  "score": 4200,
  "wave": 7,
  "chain": 23,
  "meme_rank": "Flourishing",
  "game": "capybara-swarm"
}
→ { "ok": true, "masked_name": "ChillCapybara_7F" }
```

## Adding More Games

1. Drop a new HTML file in `app/public/`
2. Use the same `/api/scores` endpoint with a different `game` param
3. Leaderboards are per-game automatically

---

*Powered by real capybara meme lore 2021–2026*
*Ok I Pull Up • Coconut Doggy • Capybara of Indifference • Italian Brainrot*
