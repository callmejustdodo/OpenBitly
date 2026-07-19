import type { Context } from "hono";
import { renderSVG } from "uqr";
import type { App } from "./index";

// The short URL for a slug never changes, so the QR is immutable and cacheable.
export async function qr(c: Context<App, "/:slug/qr">) {
  const slug = c.req.param("slug");
  const exists = await c.env.DB.prepare("SELECT 1 FROM links WHERE slug = ?")
    .bind(slug)
    .first();
  if (!exists) return c.notFound();

  const shortUrl = new URL(`/${slug}`, c.req.url).toString();
  const svg = renderSVG(shortUrl, { border: 2 });
  return c.body(svg, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
}
