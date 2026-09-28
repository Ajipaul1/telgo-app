# Telgo app: rules for every change

These rules come first. Every screen and every change, now and later, must pass all of them.
They are the owner's standing rules (Aji Paul, 28 Sep 2026), with the truth rules taken from the Viraat Marine ERP.

## 1. Phone only, like a real app
- The app is built only for a phone held upright (360 to 430 px wide). There is no desktop layout; on a computer it opens as a phone-sized column.
- It installs to the home screen on Android and iPhone and runs full screen. The Android APK opens the same app.
- Every button and menu item is at least 48 px tall. Text in any input is at least 16 px (iPhones don't zoom).
- Nothing works only on hover. Content stays clear of the notch and the home bar.
- Fast: fonts and scripts come from the app's own address; nothing from outside blocks the first screen.

## 2. One menu, plain words, same order
- Every feature is reached from the menu on the left: the menu button top-left, or a swipe from the left edge.
- **Icons live only in the menu** (owner's rule). The screens themselves use words, not icons.
- Features sit in plain-word groups that keep the same order everywhere:
  - **Admin:** Home · Team (Employees, Access requests, Live location, Attendance) · Projects (All projects, Edit projects, Site storage) · Reports (To review, Asked to fix, Saved reports, Totals, Wages, Fuel, Travel, Room rent, Tool rent, Other expenses, Site progress) · File manager · You (Notifications, Chat, Profile) · System (Sign-ins, Change log, Problems).
  - **Site staff (supervisor, engineer):** Home · Attendance (Sign in / out, My attendance) · Daily report (New report, My reports) · Site (Projects, Site storage) · You (Notifications, Chat, Profile).
  - **Accounts:** Home · Attendance (Sign in / out, My attendance) · Reports (Saved reports, Totals, Wages, Fuel, Travel, Room rent, Tool rent, Other expenses, Site progress) · Projects (All projects) · You.
  - **Client:** Home · Progress (Projects, Approved work) · You.
- The admin's Home answers at a glance: who is working today and where, what time each person signed in, and whose report for yesterday came in and whose did not.

## 3. Real data only (no ghost data)
- A screen shows only what is really in the database, fetched now. No sample projects, no demo people, no made-up numbers, no fallback locations.
- A value that was never recorded shows as "not recorded" or "—". It is never guessed.
- If there is nothing yet, the screen says so in plain words.
- Totals are always worked out from the approved reports themselves (the database view `v_ledger_daily`), so they can never drift or be counted twice.
- Test data never reaches a real screen: test logins are marked `is_test`, and everything they make is marked too. Real people only ever see real rows.

## 4. The database decides who sees what (core connection)
- The phone never talks to the database. Only this app's server does, with the secret key, through one file: `src/lib/server/core.ts`. No other file may create a database client.
- The public key has no rights at all: every table has row security on and every right taken away (migration 0001).
- Every server route goes through one gate (`src/lib/server/api.ts`): the change must come from the app's own page, the sign-in is checked with the database, the role must be allowed. Deny by default.
- A supervisor sees only their own reports and attendance. Accounts see money, not people's locations. A client sees only the projects shared with them, and never costs.
- Secret keys never go in this repo, in the browser or in a chat. They live in `.env.local` (never uploaded) and in Vercel's settings.

## 5. Truth rules (from the Viraat ERP)
- **No ghost loading:** a screen never sits blank or spinning. It shows what it loaded, or after 12 seconds says it is still trying, and after 30 seconds says in plain words why it couldn't, with Try again.
- **Write confirmation:** nothing is shown as saved until the server returns what the database saved, with the server's time ("Sent at 6:42 pm").
- **No silent overwrite:** every edit carries the version the screen showed (`updated_at`). If someone changed it since, nothing is saved and the person is told.
- **No double sends:** every new report, sign-in and chat message carries its own reference; sending twice saves once.
- **All or nothing:** a change that touches several records happens in one database function (sign in, ask to fix, admin edit, file manager moves).
- **Live, never under your hands:** lists refresh by themselves (about every 20 seconds, and when the app comes back), but a form being filled is never redrawn or cleared. A draft is kept on the phone until the server confirms it.
- **Error Doctor:** every failure is said in plain words with a reference number (T-XXXXXX). The details go to System → Problems for the admin, never to the phone.
- **New version:** when a new version is live, the app says so and reloads by itself when nobody is typing.
- **No security theatre:** never claim a protection the code doesn't enforce.

## 6. Security layers (never remove one)
- Passwords are stored with scrypt and a salt of their own. Old logins are upgraded the first time they sign in. There is no master password and no password in the phone's storage.
- Sign-in: 5 wrong passwords lock that login for 15 minutes; 30 failures in an hour block the network. Every attempt is recorded (System → Sign-ins).
- A new login gets a temporary password shown once to the admin, and must change it before anything else.
- The sign-in is a random ticket checked with the database on every request: a blocked or archived login is out at its next tap. An admin login unused for 12 hours signs itself out. "Sign out on all phones" is in Profile and in Employees.
- The change log only grows: nobody can edit or delete it, not even the admin. The database writes it itself (who, what, before and after; passwords never copied).
- Rate limits on every change per person and on public forms per network.
- Files are private: stored after their real type is read from their bytes, served only through the app to people allowed to see them.
- The browser is locked down: a strict Content-Security-Policy with a new nonce per page, HSTS, no framing, no sniffing, location/camera/microphone only for this app.
- Every page sends noindex.

## 7. Everything can be removed, in an organised way (File manager)
- The admin's **File manager** has one section per kind of data (Daily reports, Attendance, Site storage, Projects, Photos and files, Chats, People), each with **Active, Archived and Trash**, and a search.
- **Archive** takes a record out of everyday lists without losing it (archived reports still count in totals: the work happened). **Unarchive** brings it back.
- **Trash** keeps it **90 days** (owner's rule) so it can be restored. After 90 days it is deleted for good, with its photos and files, by the clean-up job.
- People are never put in the Trash (their reports must keep their name): they are archived or blocked.
- Nothing is ever deleted any other way. The database refuses a direct delete.

## 8. Notifications and push
- Only the database makes notifications (triggers), so none can be faked and none is missed. Nobody is told about their own action.
- Every notification also goes to the phone (push), Android and the iPhone Home Screen app (iOS 16.4+), even when the app is closed. Turned on per phone in the bell.
- Who is told: a new report (admins), approved (its supervisor), asked to fix (its supervisor), fixed (admins), a message on a report (the other side), a sign-in away from site (admins), a new access request (admins), material added at a site (admins), a chat message (the chat's people, one card per chat, never the message text).

## 9. Voice and easy entry
- Every note and message box has Speak (speech to text, English or Malayalam, chosen in Profile) and every message from the admin has Listen (read aloud).
- Forms go one step at a time with big buttons; a step can be skipped when it has nothing.

## 10. Design: from the Telgo logo
- Colours come from the logo: indigo ink `#270869`, cyan `#13D3E3`, blue `#478BD0`, violet `#7A5CFF`, and the gold of the bolt `#F5B400` for highlights. Fonts: Sora for headings, Manrope for text (self-hosted).
- The menu is deep indigo with the logo; screens are light, calm and roomy; status is shown in words and colour, not icons.

## 11. Smoke tests before every push
- `npm test` runs three suites against the local test database (Docker), never against live data:
  - `test:static`: no second database client, no secrets in the code, no demo data, every write confirmed.
  - `test:api`: every security layer and every rule above, as real requests.
  - `test:ui`: every screen and every form on a phone (Android Chrome and iPhone WebKit), filled and saved, checked against the database; no errors, nothing wider than the phone, no endless loading.
- A change is not finished until all three pass.

## Where the logins and keys are
- Private values live in `.env.local` in this folder (never uploaded) and in the Vercel project settings. What's current and what's next: `PROGRESS.md`.
