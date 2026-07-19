-- Migration number: 0001
CREATE TABLE links (
    slug        TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    visit_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE visits (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL REFERENCES links(slug) ON DELETE CASCADE,
    ts       TEXT NOT NULL,
    referrer TEXT,
    country  TEXT,
    ua       TEXT
);

CREATE INDEX idx_visits_slug_ts ON visits(slug, ts);
