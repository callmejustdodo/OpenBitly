# OpenBitly

Open source alternative to Bitly. Short links on your own domain, with QR codes,
visit counting, and editable destinations — running entirely on Cloudflare
(Workers + D1), free-tier friendly.

## Features

- Short link creation with random or custom slug (web dashboard + REST API)
- Fast 302 redirects at the edge
- Editable destination — repoint a link without changing its slug or QR code
- Visit counting with per-day / referrer / country breakdowns
- Auto-generated SVG QR code for every link

## Quickstart (local)

```sh
npm install
cp .dev.vars.example .dev.vars   # local API token (default: dev-token)
npm run db:migrate:local
npm run dev                      # http://localhost:8787
```

Open http://localhost:8787, enter the API token, and create a link — or use the API:

```sh
curl -X POST http://localhost:8787/api/links \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"destination": "https://example.com", "slug": "hello"}'
```

## Deploy

```sh
wrangler d1 create openbitly     # paste the id into wrangler.toml
npm run db:migrate
wrangler secret put API_TOKEN
npm run deploy
```

Then add your custom domain to the Worker in the Cloudflare dashboard.

## API

All `/api/*` routes require `Authorization: Bearer <API_TOKEN>`.

| Method & path | Purpose |
|---|---|
| `POST /api/links` | Create (`{destination, slug?}`) |
| `GET /api/links` | List |
| `GET /api/links/:slug` | Get one |
| `PATCH /api/links/:slug` | Change destination |
| `DELETE /api/links/:slug` | Delete |
| `GET /api/links/:slug/stats?days=30` | Visit stats |
| `GET /:slug` | Redirect (public) |
| `GET /:slug/qr` | QR code SVG (public) |

## Docs

- [One pager](docs/0_one_pager.md) — what and why
- [Architecture](docs/1_architecture.md) — how
