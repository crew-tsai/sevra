# Handoff — Sevra, 7 October 2026

Context for continuing this work elsewhere. Written for an assistant picking it up cold.

---

## 1. What Sevra is

A crisis-communications platform by **The Stellar Crew LLC**. It watches social media for
signs a client is in trouble, classifies what it finds by risk, opens incidents, drafts
holding statements, routes them through approval, and publishes them.

**Two repositories:**

| | |
|---|---|
| `Sevra` | the product — React/Vite + Supabase, one deployment per client |
| `sevra-console` | the control plane — provisioning, fleet sync, support, heartbeats |

**Architecture:** one Supabase project and one Vercel project **per client**. The control
plane provisions them, syncs them to the product repo's `main`, and watches their health.

**Supabase project refs** (verify with `supabase projects list` — never trust a ref taken
from an app URL):

```
ocuicsgffeucdxqyzsai   control plane
cbkeuuudcqgfpdkwevto   Arajet      (canary; formerly The Stellar Crew's own workspace)
bdqjfrahzlcxbtmtlbxl   Carryt      (provisioned, entirely unconfigured)
qvkvkgjfnpzdzakhufwv   Lessence    (provisioned, entirely unconfigured)
```

**Arajet** is a prospect airline, the only configured workspace, and the one all live work
targets. Carryt and Lessence have no handle, no sources and no topics, so monitoring does
nothing for them until someone fills in Admin → Company.

---

## 2. Conventions that will waste your time if you don't know them

- **`supabase db query --linked " <SQL>"` needs a leading space** inside the quotes.
  `-f` and `--project-ref` are not supported on `db query`.
- **`supabase functions deploy` does not typecheck.** It bundles with esbuild, so a
  function calling an undefined identifier deploys clean and throws at runtime. Run
  `npm run check:functions` first — it runs `deno check` over every function.
- **Edge functions cache their environment.** A frequently-invoked function needs a
  redeploy to see a new secret; a cold one picks it up immediately.
- **Mirrored modules.** `src/lib/*.ts` and `supabase/functions/_shared/*.ts` must be
  byte-identical for `crisis-level.ts`, `workflows.ts`, `industries.ts`,
  `watched-sources.ts`. `npm run build` enforces it.
- **`npm run build`** = shared-sync check → `tsc --noEmit` → `vitest run` → `vite build`.
  36 tests. i18n uses `defineMessages({en, es})`, so a missing Spanish key fails `tsc`.
- **The git remote is `github`, not `origin`.**
- **Secrets:** never paste values into chat. The user runs `supabase secrets set`
  themselves. `supabase secrets list` shows names only, which is safe.
- **Deletes are blocked** by a permission classifier. Anything resembling a mass delete
  must be handed to the user as SQL for the Supabase SQL Editor. Scoped deletes with a
  `WHERE` clause sometimes pass; unqualified ones never do. Do not route around this.

---

## 3. The recurring bug class in this codebase

**A Supabase write that touches zero rows returns success.** This has shipped three times:

1. `leads` had an anon INSERT *policy* but no `GRANT`. Postgres checks privileges before
   policies, so the public demo form could never have worked.
2. `social_mentions` had `UPDATE ... USING (auth.uid() = created_by)`, and every collected
   mention has `created_by` NULL — so the classifier-feedback feature recorded **zero
   verdicts on 133 mentions** while showing a success toast each time.
3. `social-monitor-control` refused signed-in users, the page swallowed the 401, and the
   UI rendered "unknown" as **"Paused"** — telling the user their crisis monitoring was
   off while its cron ran every 15 minutes.

**When reviewing a mutation:** check the RLS predicate can be true for rows that actually
exist (`created_by` is NULL on anything a cron inserted), check the table has the matching
GRANT, and append `.select()` so an empty result is detectable.

---

## 4. What was done on 7 October — monitoring

Nine commits, all on `github/main`. The theme: collection looked healthy and wasn't.

| Commit | |
|---|---|
| `7ade207` | a watchlist bigger than one X query was 83% invisible |
| `657397e` | collector saw ten posts per tick and nobody's audience |
| `5579d5f` | a healthy workspace reported "0 networks" |
| `a06060a` | unrelated noise was kept for a year |
| `818bba0` | feed sorted by collection time, not when posts were written |
| `d2cfe37` | every figure on Social Intel counted only the first 100 rows |
| `71ec458` | filtering, counting and paging moved into the database |
| `abf1a94` | engagement refresh + retweets on watched-source queries |
| `fe18034`, `3291c76`, `2958cab` | the monitor status card lying about being paused |
| `ede1b3a` | response plan rendered as a wall of text |

**Substance:**

- X search was capped at `max_results: 10` per query with no cursor and no paging, so each
  tick re-read the newest ten rather than everything since the last run. Now pages of 100
  with a per-query cursor in `monitor_cursors`. First real run collected 30 where the
  previous 24 hours had produced 14.
- Author audience was never measured — the code asked for `user.fields=verified`, the
  dead pre-Blue field, and never requested `public_metrics`. `is_verified` was false on
  all 133 rows. Now uses `verified_type` and follower counts; government and business
  accounts count as amplifiers whatever their following.
- Engagement was frozen at collection time, so a complaint stored at 2 retweets stayed at
  2 forever. `refreshMetrics` re-reads recent mentions for metrics only, bounded to 72h.
- `detect_mention_surge()` adds volume and topic-cluster checks with cooldowns, writing to
  `monitor_alerts`. It alerts; it does not open incidents. **Thresholds (8/hour at 4×
  baseline, 4 sharing a sub-type) are guesses that have never seen a real surge.**
- `social_mentions.crisis_level` is now stored, written by `sevra-analyze` from the shared
  `crisisLevel()`. **There is deliberately no SQL copy of those rules** —
  `src/lib/crisis-level.ts` explains why. Rows missing it are backfilled by the monitor
  through the same function.
- Retention split in two: dismissed noise expires in 7 days, everything else at 365.

**Arajet was wiped and rebuilt** at the user's request (incidents, mentions and
`monitor_cursors` all deleted, then re-collected). Result: 70 mentions, 4 noise (6%,
previously 53%), 3 real incidents — overbooking, a flight delay, website faults.

---

## 5. What was done on 7 October — Meta

**Goal:** one Meta app approved for Advanced Access so clients connect Facebook and
Instagram in one click without touching a developer portal. X already works this way.

**Outcome: Merx LLC business-verified the same day.**

Background: the Meta app was originally owned by **The Stellar Crew**, whose business
verification has been *In Review* since **19 September** — 18 days and counting. The user
decided to pursue a second entity, **Merx LLC**, which is one of the two owners of The
Stellar Crew. I argued twice that this was a fallback rather than a faster route. I was
wrong: Merx verified in minutes.

**Current Meta state:**

```
Merx portfolio    1118989097142108   VERIFIED 2026-10-07
App               1422580146676547   owned by Merx LLC
Login config      3156875411370865   user access token, 4 Page permissions
Redirect URI      https://ocuicsgffeucdxqyzsai.supabase.co/functions/v1/oauth-relay
Old app           1086614267426288   The Stellar Crew, config 1768401581038390
```

**Merx LLC facts** (Florida, verified against Sunbiz and the 2026 annual report):

```
Legal name        MERX LLC
Document number   L16000159405
Formed            25 August 2016, ACTIVE
Business address  3422 Red Candle Dr, Spring, TX 77388
Officers          Ronald Ayala (President), Daniela Restrepo Cardona (AMBR)
Website           merxcorp.com
```

**What made verification pass:** internal consistency. Merx had **four** addresses across
its documents — Pompano Beach on the 2016 IRS notice, Fort Lauderdale as the Sunbiz
principal address and on the website, Spring TX as the Sunbiz mailing address, and
Sunrise FL on one bank statement. The submission used only documents agreeing on Spring,
TX, and picked a document for each half of the check: the IRS CP 575 (which Meta lists as
*IRS SS-4, Recommended*) for the legal name, and an address document for the address.

**Two traps hit live, both silent:**
- Public records contain a **second company called Merx LLC** with an EIN ending `05`
  rather than `31` — and one of those records listed our address, making it the tempting
  pick. Check the EIN before selecting any record.
- After choosing "My business isn't listed", the wizard carried a bad state from that
  record and showed `SPRING, FL` against a Texas ZIP. Going back and re-entering `TX`
  fixed it. **Read the header on the upload screen before attaching anything.**

Full detail in `docs/merx-meta-submission.md`; strategy and timelines in
`docs/meta-verification-runbook.md`.

---

## 6. Outstanding

**Meta — next gates**
1. **Tech Provider / access verification.** Now unblocked. Required to submit to App
   Review and to "request access to data from other businesses", which is Sevra's model.
2. **Five screencasts, one per permission.** The long pole and the commonest cause of
   rejection. `pages_manage_posts` must show a post **actually publishing and appearing
   live on a Page** — a reading-only video gets it rejected outright, not downgraded.
3. **merxcorp.com says nothing about Sevra.** A reviewer sees an oil & gas parts company
   owning a crisis-comms app whose privacy policy names a third company. Add Sevra under
   the site's "AI Micro Apps" line.
4. **Legal pages name the wrong operator.** `src/i18n/messages/legal.ts` defines
   `COMPANY = "The Stellar Crew LLC"`, which feeds the English and Spanish privacy policy,
   terms and data-deletion pages — the pages a reviewer opens from the app listing. Under
   a Merx-owned app the accurate wording discloses the chain, **not** a swap of one name
   for the other, which would be false. Proposed text is in §8 of the submission pack and
   **needs the user's sign-off**; it is a public statement about their companies.
5. **Only ever submit one app to App Review.** Both are named Sevra and near-duplicate
   apps across portfolios get flagged.

**Monitoring**
- Surge thresholds are untested guesses — revisit after the first real surge.
- `noise_retention_days` (7) is not exposed in the Admin UI; it's a column edit.
- The control plane seeds `PLATFORM_META_*` to every newly provisioned client, so a new
  client inherits the **unreviewed** Meta app and Facebook/Instagram connect fails for
  anyone not added as a Tester, instead of falling back to asking for their own
  credentials. This will bite on the next onboarding.
- Carryt and Lessence remain unconfigured.

**Product**
- `IncidentDetail` timeline renders consecutive mentions from one author as separate
  contentless rows — eight identical "Mention on twitter from @x" lines read as a glitch
  rather than "one person posted eight times". Offered, not yet done.

---

## 7. Working style the user expects

- Verify against live state before diagnosing — deployed functions and the database have
  drifted from the repo before.
- Say plainly when something was wrong, including your own earlier advice. Several
  corrections in this session were to things I had asserted confidently.
- Do not commit without asking. The user pushed back on documentation commits made
  during what they considered a conversation.
- Test fixes against live data and report the actual numbers, not the intent.
