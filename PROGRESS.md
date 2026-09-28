# Progress: Telgo app rebuild

Read RULES.md first.

## Where things are (28 Sep 2026, evening)
- **Live:** https://telgo-app.vercel.app runs the rebuild (main = 4b24f2a; the Android APK opens it). The live database has migrations 0001-0005 (applied with the owner's OK; every row count was the same before and after; the public key is refused on every table).
- The rebuild was made in a second working folder of the same repo (`D:\Projects\GitHub\telgo-app-rebuild`, branch `rebuild`); the owner's folder `D:\Projects\GitHub\telgo-app` needs a Pull in GitHub Desktop to show it.
- The old app is kept, moved (not deleted) into `legacy/`. It is not built or served.
- Everyone signs in once more (the old sessions ended). Old passwords still work and are upgraded at that sign-in.
- `app.telgopowerprojects.com` shows only a GitHub Pages README (the `CNAME` file). To make it open the app, point its DNS at Vercel and add the domain in the Vercel project.
- Tests at the push: static 14/14, API 93/93, Android 89/89, iPhone (WebKit) 89/89.

## Waiting (28 Sep 2026, late)
- Live main = 9d13cb5: map pictures fixed (OpenStreetMap; Google Maps when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in Vercel), "Open in Google Maps" links, white menu words.
- Built and tested on the local copy, NOT yet on main: the pop-up chat (Chat bubble, Team chat pinned on top, Minimise keeps your chat, + New group, stickers and emoji, @mentions, voice note preview, change / send again / copy / remove, message info, clear chat for me / for everyone, add people, show earlier messages). It needs `supabase/rebuild/LIVE-APPLY-0006.sql` run on the live database FIRST (Supabase > SQL Editor > paste > Run), then push `rebuild` to `main`. Pushing without it would break the live chat.

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
