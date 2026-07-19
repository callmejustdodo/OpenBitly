# OpenBitly — One Pager

## What is this?

OpenBitly is an open source URL shortener — an alternative to Bitly that you deploy to your own account on a single infra provider. You give it a long URL, it gives you a short link (and its QR code) that you control, on your own domain, with analytics you own.

## Problem

- Commercial link shorteners (Bitly, Rebrandly, etc.) gate core features — custom domains, analytics, API volume — behind expensive plans.
- Links created on a SaaS shortener are a liability: if the service changes pricing, rate-limits you, or shuts down, every link you've ever shared breaks.
- Click data flows through a third party, which is a non-starter for privacy-sensitive teams.

## Solution

A lightweight service that covers the core Bitly workflow:

1. **Shorten** — create short links via web UI or REST API, with optional custom slugs.
2. **Redirect** — fast, reliable redirects on your own domain.
3. **Measure** — count every visit per link, without sending data to a third party.
4. **Share** — every link gets a QR code, generated automatically.

## Infrastructure constraint

The entire service — app, redirects, database, analytics — runs on **a single infra provider** (e.g. Vercel or Cloudflare) to keep cost and operational overhead minimal. No separate database host, no third-party analytics service, no multi-cloud setup. The stack should fit comfortably in the provider's free tier for personal use.

## Target users

- Developers and small teams who want branded short links without per-seat SaaS pricing.
- Companies with privacy or compliance requirements that rule out third-party analytics.
- Self-hosting enthusiasts running their own infrastructure.

## Core features (v1)

- Short link creation with random or custom slug
- HTTP redirects (302, so destinations stay editable without cache issues)
- **Editable destination** — change where an existing short link points at any time, without changing the slug or QR code
- **Visit counting** — every link tracks its total visits (plus timestamp, referrer, country when available)
- **QR code per link** — auto-generated for every short link, downloadable from the dashboard and API
- REST API with token authentication
- Simple web dashboard for managing links and viewing stats

## Later (not v1)

- Link expiration and password-protected links
- Multi-user teams and roles
- Bulk import/export, Bitly migration tool

## Differentiators

- **Ownership** — your domain, your database, your data. Links never die because a vendor did.
- **Simplicity & cost** — one provider, one deploy. No servers to run, no database to host separately; free-tier friendly.
- **Open source** — free to use, audit, and extend.

## Success criteria

- A new user can go from clone to a working short link in under 5 minutes.
- Redirect latency low enough to be imperceptible (p99 well under 100 ms, excluding network).
- Analytics accurate enough to trust for campaign measurement.
