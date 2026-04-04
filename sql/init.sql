-- ══════════════════════════════════════
-- CAMIEO.COM — High Scores
-- One table. Two core columns. Done.
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS high_scores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  masked_name VARCHAR(64)  NOT NULL,
  score       INT          NOT NULL DEFAULT 0,
  wave        INT          NOT NULL DEFAULT 0,
  chain       INT          NOT NULL DEFAULT 0,
  meme_rank   VARCHAR(64)  DEFAULT 'Lurker',
  game        VARCHAR(32)  NOT NULL DEFAULT 'capybara-swarm',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_game_score (game, score DESC),
  INDEX idx_masked (masked_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
