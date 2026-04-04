const express = require("express");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.set("trust proxy", true); // Coolify runs behind proxy
app.use(express.static(path.join(__dirname, "public")));

// ══════════════════════════════════════
// IP → Fun Name Masking
// ══════════════════════════════════════

const ADJECTIVES = [
  "Chill", "Zen", "Unbothered", "Moisturized", "Flourishing",
  "Sleepy", "Vibing", "Floating", "Cozy", "Majestic",
  "Funky", "Cosmic", "Spicy", "Chunky", "Sneaky",
  "Turbo", "Swampy", "Muddy", "Toasty", "Breezy",
  "Crispy", "Wavy", "Wobbly", "Fuzzy", "Squishy",
  "Groovy", "Bouncy", "Mellow", "Zappy", "Drippy",
  "Goofy", "Wonky", "Snappy", "Peppy", "Nifty",
];

const NOUNS = [
  "Capybara", "CoconutDog", "Capy", "Watermelon", "Rodent",
  "Coconut", "HotSpring", "Onsen", "PullUp", "Brainrot",
  "Doggy", "Chonker", "Nugget", "Potato", "Loaf",
  "Puddle", "Noodle", "Biscuit", "Muffin", "Turnip",
  "Goblin", "Gremlin", "Tadpole", "Pebble", "Sprout",
  "Pickle", "Dumpling", "Wombat", "Truffle", "Crouton",
  "Walnut", "Pretzel", "Nacho", "Tater", "Rascal",
];

function maskIp(ip) {
  const hash = crypto.createHash("sha256").update(ip + "coconut-doggy-salt").digest("hex");
  const adjIdx = parseInt(hash.slice(0, 4), 16) % ADJECTIVES.length;
  const nounIdx = parseInt(hash.slice(4, 8), 16) % NOUNS.length;
  const suffix = hash.slice(8, 10).toUpperCase();
  return `${ADJECTIVES[adjIdx]}${NOUNS[nounIdx]}_${suffix}`;
}

// ══════════════════════════════════════
// MySQL Pool
// ══════════════════════════════════════

let pool;

async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "camieo",
    password: process.env.DB_PASS || "capyb4r4_sw4rm",
    database: process.env.DB_NAME || "camieo",
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Verify connection
  const conn = await pool.getConnection();
  console.log("✅ MySQL connected");
  conn.release();
}

// ══════════════════════════════════════
// Routes
// ══════════════════════════════════════

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", vibe: "unbothered" });
});

// Submit score
app.post("/api/scores", async (req, res) => {
  try {
    const { score, wave, chain, meme_rank, game } = req.body;

    if (!score || typeof score !== "number" || score < 0 || score > 999999) {
      return res.status(400).json({ error: "invalid score" });
    }

    const ip = req.ip || req.connection.remoteAddress || "0.0.0.0";
    const masked = maskIp(ip);

    await pool.execute(
      `INSERT INTO high_scores (masked_name, score, wave, chain, meme_rank, game)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        masked,
        Math.floor(score),
        Math.floor(wave || 0),
        Math.floor(chain || 0),
        String(meme_rank || "Lurker").slice(0, 64),
        String(game || "capybara-swarm").slice(0, 32),
      ]
    );

    res.json({ ok: true, masked_name: masked });
  } catch (err) {
    console.error("Score submit error:", err);
    res.status(500).json({ error: "db error" });
  }
});

// Leaderboard
app.get("/api/scores/:game", async (req, res) => {
  try {
    const game = String(req.params.game).slice(0, 32);
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);

    const [rows] = await pool.execute(
      `SELECT masked_name, score, wave, chain, meme_rank, created_at
       FROM high_scores
       WHERE game = ?
       ORDER BY score DESC
       LIMIT ?`,
      [game, limit]
    );

    // Also get this player's rank
    const ip = req.ip || req.connection.remoteAddress || "0.0.0.0";
    const masked = maskIp(ip);

    const [personal] = await pool.execute(
      `SELECT MAX(score) as best, COUNT(*) as plays
       FROM high_scores
       WHERE masked_name = ? AND game = ?`,
      [masked, game]
    );

    res.json({
      leaderboard: rows,
      you: {
        masked_name: masked,
        best: personal[0]?.best || 0,
        plays: personal[0]?.plays || 0,
      },
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "db error" });
  }
});

// SPA fallback — serve index.html for unmatched routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ══════════════════════════════════════
// Boot
// ══════════════════════════════════════

async function main() {
  await initDb();
  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, "0.0.0.0", () => {
    console.log(`🦫 Camieo brainrot server live on :${port}`);
    console.log(`🍊 Ok I pull up`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
