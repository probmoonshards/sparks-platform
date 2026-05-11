# SPARKS — Setup Guide

## URL Structure (real routing!)
| URL | Page |
|-----|------|
| `/` | Home — browse notes |
| `/notes/[id]` | Individual note viewer |
| `/capstones` | Capstones & SIPs list |
| `/capstones/[id]` | Individual capstone viewer |
| `/login` | Student login |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard |

---

## Step 1 — Install dependencies

Open Terminal / Command Prompt inside the `sparks` folder:

```bash
cd sparks
npm install
```

---

## Step 2 — Add your Supabase keys

Open `lib/supabase.ts` and replace:
```ts
const SUPABASE_URL = 'YOUR_PROJECT_URL'
const SUPABASE_ANON = 'YOUR_ANON_KEY'
```
with your new Supabase project URL and anon key.

---

## Step 3 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Paste the full contents of `supabase-schema.sql` and click **Run**
3. Go to **Storage** → create a bucket called `sparks-files` → toggle **Public** ON

---

## Step 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — done!

---

## Step 5 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or: push to GitHub → connect to [vercel.com](https://vercel.com) → auto-deploys.

---

## Admin access
- Go to `/admin`
- Password: `352026`

## Changing keys/password
- Supabase keys → `lib/supabase.ts`
- Admin password → `lib/constants.ts` → `ADMIN_PASSWORD`
