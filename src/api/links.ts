import { Hono } from "hono";
import type { Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import type { App } from "../index";

// Slugs that would shadow application routes.
const RESERVED_SLUGS = new Set(["api", "dashboard", "qr", "assets", "favicon.ico", "index.html"]);
const SLUG_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

type LinkRow = {
  slug: string;
  destination: string;
  visit_count: number;
  created_at: string;
  updated_at: string;
};

export const linksApi = new Hono<App>();

linksApi.use(
  "*",
  bearerAuth({ verifyToken: (token, c: Context<App>) => token === c.env.API_TOKEN })
);

function validDestination(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function randomSlug(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

function withUrls(c: { req: { url: string } }, link: LinkRow) {
  const origin = new URL(c.req.url).origin;
  return { ...link, short_url: `${origin}/${link.slug}`, qr_url: `${origin}/${link.slug}/qr` };
}

linksApi.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM links ORDER BY created_at DESC"
  ).all<LinkRow>();
  return c.json({ links: results.map((l) => withUrls(c, l)) });
});

linksApi.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !validDestination(body.destination)) {
    return c.json({ error: "destination must be a valid http(s) URL" }, 400);
  }

  const custom = body.slug !== undefined && body.slug !== "";
  if (custom) {
    if (typeof body.slug !== "string" || !SLUG_RE.test(body.slug)) {
      return c.json({ error: "slug must match [A-Za-z0-9_-]{1,64}" }, 400);
    }
    if (RESERVED_SLUGS.has(body.slug.toLowerCase())) {
      return c.json({ error: "slug is reserved" }, 400);
    }
  }

  const now = new Date().toISOString();
  const insert = (slug: string) =>
    c.env.DB.prepare(
      "INSERT INTO links (slug, destination, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING *"
    )
      .bind(slug, body.destination, now, now)
      .first<LinkRow>();

  if (custom) {
    try {
      const link = await insert(body.slug);
      return c.json(withUrls(c, link!), 201);
    } catch (e) {
      if (String(e).includes("UNIQUE")) return c.json({ error: "slug already exists" }, 409);
      throw e;
    }
  }

  // Random slug: retry a few times on the (unlikely) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const link = await insert(randomSlug());
      return c.json(withUrls(c, link!), 201);
    } catch (e) {
      if (!String(e).includes("UNIQUE")) throw e;
    }
  }
  return c.json({ error: "could not allocate a slug, try again" }, 500);
});

linksApi.get("/:slug", async (c) => {
  const link = await c.env.DB.prepare("SELECT * FROM links WHERE slug = ?")
    .bind(c.req.param("slug"))
    .first<LinkRow>();
  if (!link) return c.json({ error: "not found" }, 404);
  return c.json(withUrls(c, link));
});

linksApi.patch("/:slug", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !validDestination(body.destination)) {
    return c.json({ error: "destination must be a valid http(s) URL" }, 400);
  }
  const link = await c.env.DB.prepare(
    "UPDATE links SET destination = ?, updated_at = ? WHERE slug = ? RETURNING *"
  )
    .bind(body.destination, new Date().toISOString(), c.req.param("slug"))
    .first<LinkRow>();
  if (!link) return c.json({ error: "not found" }, 404);
  return c.json(withUrls(c, link));
});

linksApi.delete("/:slug", async (c) => {
  const res = await c.env.DB.prepare("DELETE FROM links WHERE slug = ?")
    .bind(c.req.param("slug"))
    .run();
  if (!res.meta.changes) return c.json({ error: "not found" }, 404);
  return c.body(null, 204);
});

linksApi.get("/:slug/stats", async (c) => {
  const slug = c.req.param("slug");
  const link = await c.env.DB.prepare("SELECT visit_count FROM links WHERE slug = ?")
    .bind(slug)
    .first<{ visit_count: number }>();
  if (!link) return c.json({ error: "not found" }, 404);

  const days = Math.min(Math.max(Number(c.req.query("days")) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [byDay, byReferrer, byCountry] = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT date(ts) AS day, COUNT(*) AS visits FROM visits WHERE slug = ? AND ts >= ? GROUP BY day ORDER BY day"
    ).bind(slug, since),
    c.env.DB.prepare(
      "SELECT referrer, COUNT(*) AS visits FROM visits WHERE slug = ? AND ts >= ? GROUP BY referrer ORDER BY visits DESC LIMIT 10"
    ).bind(slug, since),
    c.env.DB.prepare(
      "SELECT country, COUNT(*) AS visits FROM visits WHERE slug = ? AND ts >= ? GROUP BY country ORDER BY visits DESC LIMIT 10"
    ).bind(slug, since),
  ]);

  return c.json({
    slug,
    total_visits: link.visit_count,
    days,
    by_day: byDay.results,
    by_referrer: byReferrer.results,
    by_country: byCountry.results,
  });
});
