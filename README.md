# Concept Swipe Test — POC

Swipe-based concept testing: respondents swipe left/right on each concept
for Purchase Intent, then again for Uniqueness, with a configurable
decision-window timer and breaker screens between passes. Admin view
uploads PNG concepts per project and exports an Excel report.

## What's in here

- `public/index.html` — landing page
- `public/admin.html` — uploader/admin view (create projects, upload PNGs, get the survey link, export results)
- `public/survey.html` — the consumer-facing swipe survey
- `netlify/functions/` — the backend: projects, concepts, image serving, responses
- `netlify.toml` / `package.json` — Netlify + the one dependency (`@netlify/blobs`)

## Why this can't be a plain drag-and-drop upload

The swipe/timer/breaker screens are pure static HTML/JS — those alone
could be dropped straight onto Netlify. But data collection, image
storage, and project organization need actual server code (Netlify
Functions) talking to storage (Netlify Blobs), and that requires `npm
install` to run for the one dependency. Netlify's browser drag-and-drop
deploy ("Netlify Drop") does **not** run an install step — it only
publishes static files — so it can't bundle that dependency.

**The fix only takes two extra steps, no terminal required:**

1. Put this folder on GitHub:
   - Create a free GitHub account if you don't have one.
   - Create a new repository, then use its "Add file → Upload files" button
     in the browser to upload everything in this folder (keep the folder
     structure intact).
2. In Netlify: **Add new site → Import an existing project → Deploy with
   GitHub**, pick that repo, and click deploy. Netlify will run `npm
   install` automatically and your functions will work.

That's it — no CLI, no build config to write, nothing else to install.

## One optional hardening step

Functions that write or read sensitive data (creating projects,
uploading concepts, downloading reports) check a header against an
`ADMIN_KEY` environment variable. If you never set it, it defaults to
`changeme` so the POC works immediately — but anyone with your site URL
could then create/delete projects or pull your data. Before sharing this
with real respondents:

- Netlify dashboard → Site configuration → Environment variables → add
  `ADMIN_KEY` with a real value of your choosing → redeploy.
- Enter that same value in the "Admin key" field at the top of
  `admin.html` (it's saved in your browser so you won't retype it).

## Using it

1. Open `/admin.html`, enter your admin key, create a project (name +
   decision-window seconds).
2. Upload PNG concepts (keep each file under a couple MB for smooth
   uploads).
3. Copy the survey link shown and send it to respondents — it's
   `/survey.html?project=<id>`.
4. Watch the respondent/swipe counts on the admin page; click "Download
   Excel report" any time for a `Summary by Concept` sheet and a
   `Raw Responses` sheet.

## Known POC-scale limits (fine for 150–300 respondents, worth knowing)

- Netlify free tier: 300 credits/month. Bandwidth is the main cost driver
  here — keep concept PNGs compressed (a few hundred KB each) and you'll
  use a small fraction of that for a study this size.
- The Excel report function fetches every swipe record for a project.
  At very large response counts this could approach Netlify's function
  timeout (10s on the free plan); if that happens, say so and we can
  switch report generation to a background function.
- No login system — just the single shared admin key. Fine for an
  internal tool, not meant for public-multi-user access control.
