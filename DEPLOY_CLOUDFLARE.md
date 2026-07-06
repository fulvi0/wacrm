# Deploying wacrm to Cloudflare Workers

This app runs on Cloudflare Workers via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`), which executes Next.js in the Workers `nodejs_compat`
runtime. All server features work: middleware (Supabase auth), API routes,
WhatsApp webhooks, and `node:crypto`.

## Prerequisites

- **Node.js 20+** (`package.json` `engines`) and a package manager. This repo
  uses an npm `package-lock.json`. If you use `bun`, run `bun install` /
  `bun run <script>` instead of the `npm` equivalents below — just be consistent
  so you don't mix lockfiles.
- A Cloudflare account.

## 1. Install dependencies

```sh
npm install
```

This pulls in `@opennextjs/cloudflare` and `wrangler`, already declared in
`package.json` devDependencies.

## 2. Configure environment variables

Two places hold config, by design:

| Where | What | Why |
| --- | --- | --- |
| `wrangler.jsonc` → `vars` | non-secret (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `META_APP_ID`) | committed; available to server runtime |
| `.env.local` | everything, incl. secrets | consumed by `next build`; `NEXT_PUBLIC_*` are inlined into client bundles at build time. **gitignored** |
| `.dev.vars` | everything, incl. secrets | local Workers runtime for `npm run preview`. **gitignored** |
| `wrangler secret put …` | secrets only | encrypted, production runtime |

`.env.local` and `.dev.vars` were pre-filled during setup. The generated
`ENCRYPTION_KEY` is in both — **keep it; rotating it orphans every stored
WhatsApp token** (users would have to re-connect).

> The Supabase direct `postgresql://` connection string / DB password are **not
> used** by the app (it talks to Supabase over HTTPS). The WhatsApp phone number
> is configured **in-app** (Settings → WhatsApp), not via env.

## 3. Preview locally in the Workers runtime (recommended before deploying)

```sh
npm run preview
```

Builds with OpenNext and boots the app in the local `workerd` runtime
(http://localhost:8787). Confirm the login page renders, the favicon (`/icon`)
loads, and Supabase sign-in round-trips.

## 4. Set production secrets

Run once per secret (interactive; paste the value when prompted). The values
live in your **gitignored** `.dev.vars` file — copy each one from there:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put META_APP_SECRET
npx wrangler secret put ENCRYPTION_KEY
```

> Never paste these values into committed files. `.dev.vars` and `.env.local`
> are gitignored precisely so the secrets stay off GitHub.

## 5. Deploy

```sh
npx wrangler login   # first time only — opens a browser to authenticate
npm run deploy
```

Note the deployed URL (`https://wacrm.<subdomain>.workers.dev`).

## 6. Post-deploy: set the canonical URL

`NEXT_PUBLIC_*` values are baked in at build time, so the site URL needs a
rebuild once you know it:

1. In `wrangler.jsonc` `vars`, add `"NEXT_PUBLIC_SITE_URL": "https://…"`.
2. In `.env.local`, uncomment/set `NEXT_PUBLIC_SITE_URL`.
3. `npm run deploy` again.

## 7. Wire up WhatsApp

Point the Meta webhook at `https://<deployed-host>/api/whatsapp/webhook`.
Inbound POSTs are HMAC-verified with `META_APP_SECRET`.

## Notes

- **No R2 cache** is configured — this app is almost entirely per-user dynamic
  SSR. If you add ISR/cached routes later, enable the R2 incremental cache in
  `open-next.config.ts` (see the commented block there) and add an
  `NEXT_INC_CACHE_R2_BUCKET` binding.
- **Edge runtime is unsupported** by OpenNext; `src/app/icon.tsx` had its
  `export const runtime = "edge"` removed. Don't reintroduce `runtime = "edge"`
  anywhere.
- Regenerate Cloudflare binding types after changing `wrangler.jsonc`:
  `npm run cf-typegen`.
