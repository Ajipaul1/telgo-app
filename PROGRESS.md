# Progress: Telgo app rebuild

Read RULES.md first.

## Where things are (28 Sep 2026, night)
- **Live:** https://telgo-app.vercel.app (the Android APK opens it). The live database has migrations 0001-0007, each applied with the owner's OK (row counts the same before and after; the public key is refused everywhere). 0008 (project plan) waits for the owner's OK, then the push.
- Live now: maps (OpenStreetMap; Google when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is in Vercel), the pop-up chat (0006), passwords the admin can see and change (0007, owner's decision), the 4-step daily report with drop-downs.
- Next push (tested, needs 0008 first): the project work plan on the map (whole route + parts by type, lines along the roads, lengths measured by the server), a Back button on every screen, settings yes/no on `/api/version`.
- Google map key "Telgo maps" (Kochirent project): works on telgo-app.vercel.app and app.telgopowerprojects.com, refused elsewhere. Routes API not allowed yet: lines follow the roads with the free OpenStreetMap router until it is.
- The rebuild lives in a second working folder of the same repo (`D:\Projects\GitHub\telgo-app-rebuild`, branch `rebuild`); the owner's folder `D:\Projects\GitHub\telgo-app` needs a Pull in GitHub Desktop to show it.
- The old app is kept, moved (not deleted) into `legacy/`. It is not built or served.
- `app.telgopowerprojects.com` shows only a GitHub Pages README (the `CNAME` file). To make it open the app, point its DNS at Vercel and add the domain in the Vercel project.
- This PC is short of memory: run the iPhone suite as `TELGO_UI_FIELD_ONLY=1 node tests/ui/run.mjs --webkit-only`.

## Built (all on the local test database)
- Database migrations `supabase/rebuild/0001`–`0005` (`0000` recreates today's live tables for local tests only; it is never run on live):
  - 0001 lockdown: the public key loses every right on every table, view, function and file.
  - 0002 truth core: sessions, sign-in attempts, the append-only change log, the Problems log, rate limits, files, soft delete, `updated_at` on every edit, report rules (dates, lock after approval), attendance one-shift-per-person, notifications made by the database, chat, push subscriptions.
  - 0003 File manager: archive, trash (90 days), restore, the 90-day clean-up.
  - 0004 per-project totals, chat helpers. 0005 inventory with admin approval, the 12-hour sign-out.
- Server: one database connection (`src/lib/server/core.ts`), the gate every route passes (`api.ts`), Error Doctor (`doctor.ts`), Truth Gate (`truth.ts`), sessions, scrypt passwords, files, push.
- Phone app: the logo design, the left menu per role, the sign-in gate for employees, Home per role, Sign in / out with GPS, daily report (7 steps), report review (approve, ask to fix, correct with reason), projects (view, edit with the route drawn on the map), live location map, attendance, inventory (add, saved items, site inventory, approvals), Reports (to review, asked to fix, saved, totals, wages, fuel, travel, room rent, tool rent, other, site progress), File manager, chat (text, photos, voice notes, PDFs, Seen), notifications with push, profile, System (sign-ins, change log, problems), the HDD log sheet.

## How to test (local only)
1. Docker Desktop on; the local database: `supabase start` in the scratch `localdb` folder (see the session notes), then `npm run db:local` (applies the migrations).
2. `npm run dev` (uses `.env.local`, which points only at the local database).
3. `npm run test:static`, `npm run test:api`, `npm run test:ui` (the last two reset the local database).

## Still to do (the owner)
1. Done 28 Sep: the live database update (0001-0005).
2. In Vercel settings add (values in `.env.vercel` on this PC, never uploaded): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (push), `CRON_SECRET` (the 90-day clean-up), and keep `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`. Optional: `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` to email login details.
3. Done 28 Sep: `rebuild` pushed to `main` (4b24f2a).
4. Rotate the keys that were pasted in chat on 28 Sep 2026 (Supabase secret and service_role keys, the Supabase access token) and the old admin password that was written in the public code.
5. Restrict the old Google Maps key (it is in the public repo's history) to your domains, or delete it: the new app doesn't use it.
6. Check the 5 projects' budgets: they may be sample values from the old app.

## Next
- The owner's review of the trial on his phone (real GPS, camera, push after the Vercel keys, voice in Malayalam).
- Run all three suites before every push.
