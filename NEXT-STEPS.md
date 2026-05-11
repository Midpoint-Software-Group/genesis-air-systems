# 🚀 Final Deployment Steps — Genesis Air Systems

I've already done the heavy lifting. Here's what's set up and what's left.

---

## ✅ Already Done (live right now)

### Supabase
- **Project:** `genesis-air-systems`
- **URL:** `https://gpkvnzjueqruucydtloc.supabase.co`
- **Region:** us-east-1
- **Status:** Live and provisioned ✓
- **Schema:** All 8 tables created with RLS enabled ✓
- **Policies:** Staff vs customer policies all in place ✓
- **Dashboard:** https://supabase.com/dashboard/project/gpkvnzjueqruucydtloc

### Netlify
- **Site:** `genesis-air-systems`
- **Site ID:** `60ca82ff-8f59-4fb0-b19f-0e0703960016`
- **URL (once deployed):** https://genesis-air-systems.netlify.app
- **Env vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` already set ✓
- **Dashboard:** https://app.netlify.com/projects/genesis-air-systems

### Source code
- All 39 files built, populated `.env` included, `dist/` pre-built and ready to deploy

---

## ⏳ Two Things You Need to Do

### Step 1 — Deploy the site to Netlify (drag & drop, 30 seconds)

The site is created but has no live build yet. Easiest path:

1. Go to https://app.netlify.com/projects/genesis-air-systems/deploys
2. Scroll down to the **"Need to update your site?"** drag-and-drop zone
3. Drag the included file `genesis-air-systems-DEPLOY.zip` (or just the `dist/` folder if you extracted it) onto the drop zone
4. Wait ~10 seconds — site goes live at https://genesis-air-systems.netlify.app

### Step 2 — Create your admin login

Once the site is live:

1. Visit https://genesis-air-systems.netlify.app/signup
2. Sign up with your real email + a strong password
3. Check your inbox for the confirmation email and click the link
4. Then I need you to run ONE SQL command to make yourself admin (you can't do it from the app since you don't have admin permissions yet)

Go to https://supabase.com/dashboard/project/gpkvnzjueqruucydtloc/sql/new and paste:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';
```

Replace `YOUR_EMAIL_HERE` with the email you signed up with. Hit **Run**.

5. Log out of the app, log back in — you'll see the full admin dashboard

---

## 🔄 Optional — Set up GitHub for source control

I couldn't auto-create the GitHub repo (the integration's create permission was disabled and `api.github.com` isn't in my sandbox network allowlist). When you're ready:

1. Go to https://github.com/new
2. Repository name: `genesis-air-systems`
3. Owner: `midpointgroupco-oss`
4. Set it to **Private**
5. Do NOT initialize with README, .gitignore, or license (leave empty)
6. Click **Create repository**

Then from VS Code terminal in `D:\dev\genesis-air-systems`:

```
git init
git add .
git commit -m "Initial commit — Genesis Air Systems V1"
git branch -M main
git remote add origin https://github.com/midpointgroupco-oss/genesis-air-systems.git
git push -u origin main
```

Once it's pushed, you can link Netlify to GitHub for auto-deploys on every push. In Netlify:
1. Site settings → Build & deploy → Continuous deployment → Link to Git
2. Pick GitHub → authorize → select `midpointgroupco-oss/genesis-air-systems`
3. Build command: `npm run build` (auto-detected)
4. Publish directory: `dist` (auto-detected)
5. Save

After that, every `git push` automatically rebuilds and redeploys.

---

## 🧪 Optional — Disable email confirmation for faster testing

If you want to skip the email verification step when signing up new users (useful while testing):

1. Go to https://supabase.com/dashboard/project/gpkvnzjueqruucydtloc/auth/providers
2. Click **Email**
3. Toggle **Confirm email** OFF
4. Save

⚠️ Turn this back ON before going to production with real customers.

---

## 🆘 If something goes wrong

| Issue | Fix |
|---|---|
| Site shows blank page | Check `VITE_SUPABASE_*` env vars in Netlify settings |
| Can't log in | Check that profile row exists in `profiles` table |
| Can't see admin pages | You forgot Step 2 above — run the UPDATE profiles SQL |
| Email confirmation never arrives | Check spam folder, or temporarily disable email confirmation (above) |

---

## Summary of Credentials

```
SUPABASE
  URL:        https://gpkvnzjueqruucydtloc.supabase.co
  Anon key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwa3Zuemp1ZXFydXVjeWR0bG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjI1MjUsImV4cCI6MjA5NDAzODUyNX0.X5JOHMyfyhRQxFSeLCNAiG7HWoZaM4yR19-EA_XYTLE
  Dashboard:  https://supabase.com/dashboard/project/gpkvnzjueqruucydtloc

NETLIFY
  Site name:  genesis-air-systems
  Site ID:    60ca82ff-8f59-4fb0-b19f-0e0703960016
  Live URL:   https://genesis-air-systems.netlify.app (once deployed)
  Dashboard:  https://app.netlify.com/projects/genesis-air-systems
```

That's it. Two clicks (Netlify drag-drop + admin promotion) and you're live.
