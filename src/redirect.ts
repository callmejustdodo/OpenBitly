import type { Context } from "hono";
import type { App } from "./index";

// Hot path: respond with the 302 first, record the visit after via waitUntil.
export async function redirect(c: Context<App, "/:slug">) {
  const slug = c.req.param("slug");
  const row = await c.env.DB.prepare("SELECT destination FROM links WHERE slug = ?")
    .bind(slug)
    .first<{ destination: string }>();
  if (!row) return c.notFound();

  c.executionCtx.waitUntil(recordVisit(c, slug));
  // 302, never 301: browsers cache 301s forever, which would break destination edits.
  return c.redirect(row.destination, 302);
}

async function recordVisit(c: Context<App, "/:slug">, slug: string) {
  const ts = new Date().toISOString();
  const referrer = c.req.header("referer") ?? null;
  const ua = c.req.header("user-agent") ?? null;
  const cf = (c.req.raw as Request & { cf?: IncomingRequestCfProperties }).cf;
  const country = (cf?.country as string | undefined) ?? null;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE links SET visit_count = visit_count + 1 WHERE slug = ?").bind(slug),
    c.env.DB.prepare(
      "INSERT INTO visits (slug, ts, referrer, country, ua) VALUES (?, ?, ?, ?, ?)"
    ).bind(slug, ts, referrer, country, ua),
  ]);
}
