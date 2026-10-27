# GGM Retailer Hub

Field follow-up for GGM retailers across Italy: retailer database, visit scheduling,
interaction log, territory-scoped staff access, maps and reports.

**Stack:** Vite + React 18 · React Router 7 · TailwindCSS · shadcn/Radix UI · TanStack Query ·
Leaflet (maps) · Supabase (Postgres + Auth + Storage) · deployed on Vercel from GitHub.

Everything in the UI behaves exactly as before — only the backend changed
(Base44 → Supabase).

> **Access model:** there is **no public sign-up**. Accounts are created by an
> administrator only (see [step 12](#12-create-accounts-admin-only)), which is enforced
> on the server, not just hidden in the interface.

---

## Table of contents

1. [Before you start](#1-before-you-start)
2. [Create the Supabase project](#2-create-the-supabase-project)
3. [Create the database](#3-create-the-database)
4. [Configure authentication](#4-configure-authentication)
5. [Create your admin account](#5-create-your-admin-account)
6. [Run the app locally](#6-run-the-app-locally)
7. [Push the code to GitHub](#7-push-the-code-to-github)
8. [Deploy on Vercel](#8-deploy-on-vercel)
9. [Point Supabase at your Vercel domain](#9-point-supabase-at-your-vercel-domain)
10. [Load your retailer data](#10-load-your-retailer-data)
11. [Install the app (PWA)](#11-install-the-app-pwa)
12. [Create accounts (admin only)](#12-create-accounts-admin-only)
13. [Security notes](#13-security-notes)
14. [Housekeeping & troubleshooting](#14-housekeeping--troubleshooting)

---

## 1. Before you start

You need, all free:

- A [Supabase](https://supabase.com) account
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account
- [Node.js 18+](https://nodejs.org) installed locally

Keep two values handy as you go — you will paste them in two places (local `.env.local`
and Vercel environment variables):

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → **Project Settings → API → Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API → `anon` `public`** |

> ⚠️ Only ever use the **anon public** key in the frontend. Never put the
> `service_role` key in this project — it bypasses every security rule. The only place
> the service-role key is used is inside the server-side `invite-user` function
> ([step 12](#12-create-accounts-admin-only)), where Supabase injects it automatically.

---

## 2. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick an organisation, name it (e.g. `ggm-retailer-hub`), set a database password
   and choose the region closest to your users (**Frankfurt** or **Milan** for Italy).
3. Wait for provisioning to finish (about a minute).
4. Open **Project Settings → API** and copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon public** key → this is `VITE_SUPABASE_ANON_KEY`

---

## 3. Create the database

Everything the app needs — tables, security rules, helper functions, triggers and the
storage bucket — is in one idempotent file: [supabase/schema.sql](supabase/schema.sql).

1. In the Supabase dashboard open **SQL Editor → New query**.
2. Open [supabase/schema.sql](supabase/schema.sql), copy the whole file and paste it in.
3. Click **Run**. You should see `Success. No rows returned`.

This creates:

| Object | Purpose |
| --- | --- |
| `profiles` | one row per user, holds `role` and the territory scope |
| `retailers` | the retailer master data |
| `visits` | scheduled / completed visits |
| `interactions` | calls, WhatsApp, notes against a retailer |
| `is_admin()`, `scope_is_all()`, `user_regions()`, `user_provinces()` | helpers used by the security rules |
| `distinct_values()`, `bulk_update()`, `entity_aggregate()` | the batch/aggregate calls the UI makes |
| row level security policies | territory-limited reads, admin-only writes |
| `on_auth_user_created` trigger | creates the `profiles` row for each new account |
| `set_attribution` trigger | stamps `created_by_id` (and `staff_email`) from the session, never from the request body |
| storage bucket `public` | file uploads, capped at 10 MB and limited to CSV/PDF/images |

> You can re-run this file any time; it never duplicates objects or wipes data.

---

## 4. Configure authentication

Go to **Authentication → Sign In / Providers**.

### 4a. Turn public sign-up off

The app must never let anyone create their own account.

1. Open **Authentication → Sign In / Providers → Email** and make sure **Email** is
   enabled (staff still sign in with email + password).
2. Turn **Enable sign-ups** (a.k.a. *Allow new users to sign up*) **OFF**. With this off,
   the Supabase `POST /auth/v1/signup` endpoint refuses every request, so no account can
   be created from outside — invitations from an admin still work.
3. Keep **Confirm email** switched **ON** so invited staff must open the invitation
   e-mail once and set a password.
4. Under **Authentication → Sign In / Providers**, leave **Email** as the only enabled
   provider. The app signs staff in with email + password and nothing else, so any
   other enabled provider is surface you do not need.

> The login screen no longer has a "Create account" link and the `/register` route is
> gone; this setting is the server-side half of the same rule.

### 4b. URL configuration

Go to **Authentication → URL Configuration**:

- **Site URL** → your production URL, e.g. `https://ggm-retailer-hub.vercel.app`
- **Redirect URLs** → add only the origins you actually use, one per line:

  ```
  http://localhost:5173/**
  https://ggm-retailer-hub.vercel.app/**
  ```

  Add one line per custom domain if you have several. Do **not** add
  `https://*.vercel.app/**`: that wildcard would accept a redirect to *any*
  `*.vercel.app` site, including one an attacker controls.

You can finish this after your first deploy — see [step 9](#9-point-supabase-at-your-vercel-domain).

---

## 5. Create your admin account

Because public sign-up is disabled, your first account is created from the dashboard.

1. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a
   password and confirm it. (This is the same path the `invite-user` function uses later.)
2. In **SQL Editor**, promote that account:

   ```sql
   update public.profiles
      set role = 'admin', scope_type = 'all'
    where email = 'you@example.com';
   ```

   Every new account starts as a plain `user` with **no territory**, which means it sees
   no retailers until you assign one.

3. Sign out and back in. You now have full access and can grant territories and create
   other users from the **Staff** page.

---

## 6. Run the app locally

```bash
npm install
```

Create `.env.local` in the project root (copy `.env.example`) and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Then:

```bash
npm run dev
```

Open <http://localhost:5173>. Sign in with the admin account from step 5.

Other useful commands:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # eslint
```

> If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing, the app still renders but
> every page is empty and the console warns `[supabase] ... are not set`.

> On Windows PowerShell, run the commands through `npm.cmd` (e.g. `npm.cmd run dev`) if
> the `npm.ps1` wrapper is blocked by the execution policy.

---

## 7. Push the code to GitHub

Create an empty repository on GitHub (no README, no .gitignore), then from the project root:

```bash
git init
git add .
git commit -m "GGM Retailer Hub — Vercel + Supabase"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env.local` is gitignored, so your keys are **not** pushed. `.env.example` is committed on
purpose as a template.

---

## 8. Deploy on Vercel

1. Go to <https://vercel.com/new> and **Import** the GitHub repository you just pushed.
2. Vercel auto-detects Vite. Confirm the settings (they also come from `vercel.json`):
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Expand **Environment Variables** and add both, for **Production**, **Preview** and
   **Development**:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |

4. Click **Deploy**. When it finishes, open the URL Vercel gives you
   (`https://<project>.vercel.app`).

`vercel.json` also sets the security headers (CSP, HSTS, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`) and the SPA rewrite that sends every unknown
path to `index.html`, so deep links like `/retailers/<id>` work on refresh.

> ⚠️ Vite inlines environment variables at **build time**. If you add or change a variable
> in Vercel you must trigger a **new deployment** (Deployments → ⋯ → Redeploy) for it to
> take effect.

### Later deploys

Every push to `main` deploys automatically. Pull requests get their own preview URL.

---

## 9. Point Supabase at your Vercel domain

After the first deploy, go back to Supabase → **Authentication → URL Configuration** and
make sure:

- **Site URL** is your Vercel domain, e.g. `https://ggm-retailer-hub.vercel.app`
- **Redirect URLs** include `https://ggm-retailer-hub.vercel.app/**`

Otherwise invitation and password-reset e-mails will redirect to `localhost` and the
flow fails.

---

## 10. Load your retailer data

Three ways to get data in:

- **Retailer data page → Import** (admin): upload a CSV/XLSX. Columns are matched by header
  name and Italian aliases (`cliente`, `insegna`, `indirizzo`, `cap`, `citta`,
  `provincia`, `regione`, `cellulare`, `saldo`, …). Existing rows are matched on
  `customer_id` and updated, new ones inserted.
- **Balance page** (admin): upload a balance-only file to refresh `balance` and
  `balance_updated_at`.
- **Visits → Schedule upload**: bulk-create visits from a schedule file.

To carry data over from Base44, export each entity to CSV there and re-import it here.

---

## 11. Install the app (PWA)

The app is a Progressive Web App: it can be installed on a phone or a computer and then
opens in its own window, with its own icon, like a native app. This works as soon as the
deployment is live — no store, no extra build step.

- **Android (Chrome/Edge)** — open the site, then **⋮ menu → Add to Home screen** (or
  *Install app*). Chrome usually shows an install banner on its own.
- **iOS/iPadOS (Safari)** — open the site, tap **Share → Add to Home Screen**. Apple has
  no automatic prompt, this is the only way.
- **Windows / macOS / Linux (Chrome, Edge)** — click the **install icon** in the address
  bar (a small monitor with an arrow), or **⋮ menu → Cast, save and share → Install page
  as app…**
- **Desktop Safari** — **File → Add to Dock**.

What makes it installable here:

| Piece | File | Role |
| --- | --- | --- |
| Web app manifest | [public/manifest.json](public/manifest.json) | name, icons, colours, `display: standalone` |
| Icons | [public/icon/web/](public/icon/web) | 192 & 512 px, plus *maskable* variants for Android |
| Apple icons | [public/icon/web/apple-touch-icon.png](public/icon/web/apple-touch-icon.png) | home-screen icon on iOS (180 px) |
| Favicon | [public/icon/web/favicon.ico](public/icon/web/favicon.ico) | browser tab and bookmarks |
| Service worker | [public/sw.js](public/sw.js) | required for the install prompt; gives an offline shell |

> Installation needs **HTTPS** (the Vercel domain counts) and **localhost**, which is why
> it only appears once deployed or served with `npm run preview`.

Notes:

- The service worker is registered only in production builds, so `npm run dev` is never
  served from the cache.
- Page loads are **network-first**: a new deploy shows up on the next refresh. Only the
  hashed `/assets/*`, `/vendor/*` and `/icon/*` files are cached, so you can still open
  the app when you are offline.
- To swap the icons, replace the files in [public/icon/web/](public/icon/web) keeping the
  same names — the manifest and the HTML both point at those paths.

---

## 12. Create accounts (admin only)

The **Staff → Add user** dialog calls a Supabase Edge Function named `invite-user`. That
function is **required**: it is the only way accounts are created, and it re-checks the
caller's role on the server before it uses the service-role key — so a non-admin who
manages to call it gets a `403`.

The function is already in this repository at
[supabase/functions/invite-user/index.ts](supabase/functions/invite-user/index.ts), with
its configuration in [supabase/config.toml](supabase/config.toml). Deploy it once:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy invite-user
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the
function by Supabase automatically; you do not set them yourself.

Then, as an admin: **Staff → Add user**, enter the full name, the email, and choose the role
and territory, then save. The person receives an invitation e-mail, sets a password from it,
and sees only the retailers in the territory you assigned.

> Re-deploy the function after pulling this change: it now requires the staff member's name
> along with the e-mail and stores it on the profile.

> If the function is not deployed, adding a user fails with
> *"Could not reach the invite-user function…"*. That is intentional — there is no
> client-side fallback that would let anyone create an account.

---

## 13. Security notes

What protects the deployment, and where to check it:

| Area | How it is enforced |
| --- | --- |
| **No self-registration** | Sign-ups disabled in Supabase Auth; `/register` route and all client `signUp`/OTP APIs removed. |
| **Admin-only user creation** | `invite-user` verifies the caller's JWT and re-reads their `role` from `profiles` before touching the service-role key. |
| **Territory-scoped reads** | RLS on `retailers`, `visits` and `interactions` limits reads to `is_admin()`, a `scope_type = 'all'` user, the user's regions, or rows they authored / are assigned to. |
| **Writes** | Only admins may write retailers; users may create visits/interactions and edit their own. |
| **Visit approvals** | A visit a staff member requests is stored as `status = 'pending'`; only an admin can move it to `scheduled` (approve) or `cancelled` (decline). |
| **Row attribution** | `set_attribution` overwrites `created_by_id` (and `staff_email`) from the session, so authorship cannot be forged. |
| **Secrets** | Only the `anon` key is in the frontend; `.env*` is gitignored; the service-role key lives only inside the Edge Function. |
| **Transport & framing** | `vercel.json` sends HSTS, a strict CSP (no third-party scripts — Leaflet is vendored under `public/vendor/`), `X-Frame-Options: DENY` and a restrictive `Permissions-Policy`. |
| **CSV exports** | [src/lib/csv.js](src/lib/csv.js) neutralises spreadsheet formula injection (`=`, `+`, `-`, `@`). |
| **Uploads** | Random UUID filenames with an extension allow-list, plus a 10 MB / MIME-limited bucket. |
| **Account enumeration** | The login screen returns a generic "Invalid email or password." for any failure. |

Rotate the `anon` key in Supabase and update the Vercel variable if it is ever exposed.

---

## 14. Housekeeping & troubleshooting

### Replace the logo

The logo shown inside the app is [public/ggm-logo.svg](public/ggm-logo.svg) (referenced by
[src/lib/brand.js](src/lib/brand.js)). Drop in your own `ggm-logo.svg` — keep the filename
and both the header and the signed-out pages keep working. The login, forgot-password and
reset-password screens draw it through
[src/components/GgmLogo.jsx](src/components/GgmLogo.jsx); set the height with the
`className` you pass to that component (`h-24 w-auto` on the desktop panel, `h-20 w-auto`
on phones).

The **browser favicon and the installable-app icons** are the files in
[public/icon/web/](public/icon/web) (see [step 11](#11-install-the-app-pwa)); replace them
keeping the same names to rebrand the tab and the home-screen icon.

### "Adding a user fails"

Deploy the `invite-user` function ([step 12](#12-create-accounts-admin-only)) and make sure
you are signed in as an admin.

### Nobody can see any retailers

The scope was never assigned. As admin, open **Staff → (user) → Territory & role** and pick
*All Italy*, some regions or some provinces. Until then the user sees nothing — that is
deliberate.

### "Invalid login credentials" for a user you invited

They must open the invitation e-mail once to set a password (or use *Forgot password*).
Accounts created from the Supabase dashboard **before** the schema was applied may lack a
`profiles` row; the app creates one automatically on first sign-in.

### Build fails on Vercel with "supabaseUrl is required"

The environment variables were not set (or were added after the last build). Add them in
Vercel → Settings → Environment Variables and redeploy.

### Password-reset / invitation e-mails land on localhost

Fix the **Site URL** and **Redirect URLs** in Supabase (step 9).

### Emails are not delivered

Supabase's built-in SMTP is rate-limited and meant for testing. For production, wire up
your own provider under **Project Settings → Auth → SMTP Settings**.

### Where the code lives

- [src/api/supabaseClient.js](src/api/supabaseClient.js) — the data layer: entities
  (`filter`, `list`, `get`, `count`, `create`, `update`, `delete`, `bulkCreate`,
  `bulkUpdate`, `aggregate`), `auth`, `users.inviteUser`, `integrations.Core.UploadFile`.
- [supabase/schema.sql](supabase/schema.sql) — the whole backend definition.
- [supabase/functions/invite-user/index.ts](supabase/functions/invite-user/index.ts) — the
  admin-only account-creation function.
- [.env.example](.env.example) — the two frontend variables.
- [vercel.json](vercel.json) — build settings, the SPA rewrite, the security headers and
  the service-worker caching rule.
- [public/manifest.json](public/manifest.json) + [public/sw.js](public/sw.js) — the PWA
  manifest and the installable app's service worker.

### Re-running the schema after a change

Open [supabase/schema.sql](supabase/schema.sql), copy the whole file again into the SQL
Editor and Run. It is written to be safe to repeat.
