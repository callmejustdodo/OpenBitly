import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { linksApi } from "./api/links";
import { redirect } from "./redirect";
import { qr } from "./qr";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  API_TOKEN: string;
};

export type App = { Bindings: Env };

const app = new Hono<App>();

app.route("/api/links", linksApi);
app.get("/:slug/qr", qr);
app.get("/:slug", redirect);

app.notFound((c) => c.text("Not found", 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
