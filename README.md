# Genesis Air Systems

**Field Service Management Platform for HVAC professionals.**
Built for residential and commercial heating, cooling, and service work.

- **Client:** Kevin Scotland · Genesis Air Systems
- **Stack:** React 18 · Vite · Tailwind · Supabase · Netlify
- **Design system:** Steel & Ember (navy `#1E3A8A` + ember `#EA580C`)
- **Built by:** Midpoint Accounting Group · `info@midpointcorp.com`

---

## What's inside

- **Admin platform** — Dashboard, Jobs, Dispatch board, Customers, Estimates, Invoices, Reports
- **Customer portal** — Customers can log in to see their upcoming service, history, and outstanding invoices
- **Auth + RLS** — Supabase auth with row-level security so customers only ever see their own data
- **Residential + commercial** — Customer type toggle throughout the system
- **No Stripe (V1)** — Invoices are tracked but payments are handled offline

---

## Project structure

```
genesis-air-systems/
├── public/
│   └── favicon.svg              ← The Shield logo
├── src/
│   ├── components/              ← Layout, Logo, StatusPill, StatCard, etc.
│   ├── context/AuthContext.jsx  ← Auth + role state
│   ├── lib/supabase.js          ← Supabase client
│   ├── pages/                   ← Admin pages (Dashboard, Jobs, etc.)
│   │   └── portal/              ← Customer portal pages
│   ├── App.jsx                  ← Routes + role guards
│   ├── index.css                ← Tailwind + design system classes
│   └── main.jsx                 ← Entry
├── supabase/migrations/
│   └── 001_initial_schema.sql   ← Full DB schema + RLS policies
├── .env.example
├── netlify.toml
└── package.json
```

---

## Setup (step-by-step)

### Step 1 — Unzip the project

1. Right-click the ZIP file
2. Choose **Extract All...**
3. Extract to `D:\dev\genesis-air-systems`

### Step 2 — Open in VS Code

1. Open VS Code
2. **File → Open Folder...**
3. Select `D:\dev\genesis-air-systems`
4. Click **Select Folder**

### Step 3 — Install dependencies

1. In VS Code, open the terminal: **Terminal → New Terminal**
2. Type: `npm install`
3. Press Enter and wait for it to finish

### Step 4 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it: `genesis-air-systems`
3. Pick a strong DB password and save it somewhere
4. Pick a region close to your customers (US East is fine)
5. Wait ~2 minutes for it to provision

### Step 5 — Run the database schema

1. In your new Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open `supabase/migrations/001_initial_schema.sql` from VS Code
4. Copy everything from that file
5. Paste into the Supabase SQL Editor
6. Click **Run** (bottom right)
7. You should see "Success. No rows returned."

### Step 6 — Get your Supabase keys

1. In Supabase, click **Settings** (gear icon) → **API**
2. Copy the **Project URL** — looks like `https://xxxx.supabase.co`
3. Copy the **anon public** key (the long one)

### Step 7 — Create the .env file

1. In VS Code, look at the file list on the left
2. Find `.env.example`
3. Right-click it → **Copy**
4. Right-click empty space in the file list → **Paste**
5. Rename the copy to `.env` (just `.env`, no `.example`)
6. Open `.env` and replace the placeholder values:
   - Replace `https://your-project-ref.supabase.co` with your Project URL
   - Replace `your-anon-key-here` with your anon public key
7. Save: **Ctrl+S**

### Step 8 — Run the app locally

1. Back in the VS Code terminal
2. Type: `npm run dev`
3. Press Enter
4. Open the URL it shows (usually `http://localhost:5173`)

### Step 9 — Create your admin account

1. Click **Sign up** on the login page
2. Use your real email and a strong password (at least 6 chars)
3. Check your email and click the confirmation link
4. Once confirmed, you'll be logged in BUT as a "customer" role by default

### Step 10 — Promote yourself to admin

You need to give yourself admin role in the database:

1. Go back to Supabase → **SQL Editor**
2. Click **New Query**
3. Paste this (replace the email):

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';
```

4. Click **Run**
5. Log out of the app and log back in
6. You should now see the full admin dashboard

---

## Deploying to Netlify

### Step 1 — Push to GitHub

1. Create a new repo at `github.com/midpointgroupco-oss/genesis-air-systems`
2. In VS Code terminal:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/midpointgroupco-oss/genesis-air-systems.git
git push -u origin main
```

### Step 2 — Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site → Import an existing project**
3. Pick **GitHub**
4. Authorize Netlify and select the `genesis-air-systems` repo
5. Build settings should auto-detect from `netlify.toml`. If not:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **Add environment variables** and add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
7. Click **Deploy site**

---

## User Roles

| Role | What they can do |
|---|---|
| `admin` | Everything — manage customers, jobs, techs, invoices |
| `dispatcher` | Same as admin (for now) |
| `tech` | Can see and update jobs |
| `customer` | Customer portal only — sees own jobs and invoices |

To change a user's role, run in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'tech' WHERE email = 'tech@example.com';
```

To link a customer login to their customer record:

```sql
UPDATE profiles
SET role = 'customer', customer_id = 'paste-customer-uuid-here'
WHERE email = 'customer@example.com';
```

---

## Adding a Technician

Techs are separate from logins. They go in the `technicians` table. You can add a tech directly via SQL:

```sql
INSERT INTO technicians (full_name, email, phone, is_active)
VALUES ('Kevin Scotland', 'kevin@genesisair.com', '555-1234', true);
```

(A future update will add a Settings → Techs page in the admin UI.)

---

## Design System — Steel & Ember

- **Primary:** Navy `#1E3A8A` (`navy-900` in Tailwind)
- **Accent / CTA:** Ember `#EA580C` (`ember-600`)
- **Page background:** `#F8F9FC` (`bg-page`)
- **Headings:** Georgia serif
- **Body:** System sans-serif
- **Logo:** The Shield (vertical shield with 3 chevrons representing airflow)

CSS component classes are in `src/index.css`:
- `.btn-primary` — ember orange CTA
- `.btn-navy` — navy fill
- `.btn-secondary` — white with navy border
- `.card` — white card with subtle navy shadow
- `.card-header` — navy header bar
- `.stat-card` — KPI card with navy top border
- `.pill` + variants for status badges
- `.input` / `.label` — form fields

---

## Notes & known gaps

- Invoice/estimate **detail and create pages** are placeholders. The list views work; the line-item editors are next on the roadmap.
- **No Stripe integration in V1** — payment status (`paid`/`overdue`) is updated manually.
- Tech roster page is SQL-only for now (Settings UI coming).
- **PWA / mobile tech app** is not yet built — V1 is desktop-first dispatcher UI.

---

## Credits

Built by **Midpoint Accounting Group Co.**
`info@midpointcorp.com`
