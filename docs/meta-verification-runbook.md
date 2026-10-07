# Meta Business Verification & App Review — runbook

**Goal:** one Meta app, owned by **The Stellar Crew**, approved for Advanced Access, so
every client connects Facebook and Instagram with a single click and never touches a
developer portal. Exactly what was achieved for X.

> **Who is being verified: The Stellar Crew, not Sevra.**
>
> Meta verifies a **legal entity**. Sevra is a product owned by The Stellar Crew, not a
> company, so it has no certificate of incorporation, no bank account and no utility
> bill in its name — and a verification submitted as "Sevra" fails on the first check.
>
> - **Business portfolio and every document:** The Stellar Crew, exactly as registered
> - **Meta app name:** `Sevra` — this is what clients read on the consent screen, and it
>   should stay the product name
>
> These being different is normal and expected; Meta is designed for it. What it will
> not tolerate is the *documents* disagreeing with the *portfolio*.

**Who does this:** someone with the company's legal documents and admin rights on the
Meta business portfolio. It is paperwork, not engineering — no part of it is blocked on
code. The application side is already built and waiting on two secrets.

**Sequence matters.** Verification gates App Review. App Review gates Advanced Access.
Advanced Access is what makes one-click work for other people's Pages.

---

## Timeline, realistically

| Stage | Expect |
|---|---|
| Business portfolio tenure | **30 days–3 months before you may apply at all** |
| Business Verification | days to 2+ weeks; reports of 10+ days sitting "In Review" |
| App Review, per submission | Meta now advises **20 days**; a rejection restarts it |
| **Total** | **4–8 weeks**, assuming one rejection |

> **Start today even if nothing else is ready.** The tenure requirement is a clock that
> only runs once the portfolio exists. Nothing shortens it later.

---

## Stage 0 — Before you begin

Collect these. Mismatches are the single largest cause of rejection.

- [ ] **Legal business name** — **The Stellar Crew's** registered name, exactly: accents,
      punctuation, `Ltd` / `S.A. de C.V.` and all. Not "Sevra"
- [ ] **Registered address**
- [ ] **Business phone number** — must be reachable; Meta may call or text
- [ ] **Business email on the company domain** (`@thestellar.ai`, not Gmail)
- [ ] **Website** — must be live and describe the business

Then two or three supporting documents, all in **The Stellar Crew's** name and showing
the **same** address:

| Document | Notes |
|---|---|
| Certificate of Incorporation / business registration | Strongest |
| Business licence | Country-dependent |
| Business bank statement | Must be a **business** account, issued within 12 months |
| Utility bill (electricity, gas, water, landline) | Addressed to the business, within 12 months. **Mobile bills are often rejected** |

**Format:** PDF or clear image, **under 8 MB** each.

> Meta keeps a **per-country** list of accepted documents. Submitting a type not on
> your country's list is rejected regardless of how valid it is. Check the list shown
> in the verification flow for your country before uploading.

### The rule behind most rejections

Every character must match. `The Stellar Crew S.A. de C.V.` on the certificate and
`Stellar Crew` in Business Manager is a rejection. Copy from the legal document into
Meta, not the reverse.

---

## Stage 1 — Business portfolio

1. **business.facebook.com** → create or open **The Stellar Crew's** business portfolio
2. **Settings → Business Info** — fill in every field with The Stellar Crew's legal
   details, matching the documents exactly. The product name does not appear here.
3. Confirm you have **admin / full control**
4. Check the constraints:
   - [ ] Portfolio is at least **30 days** old (some flows require 3 months)
   - [ ] **No more than three people** with full control
   - [ ] Business info has not been edited repeatedly — there is a change limit, and
         exceeding it blocks verification

---

## Stage 2 — Business Verification

> **The Start Verification button is not there at first.** Security Centre says
> *"Your organization does not need to be verified"* until an app linked to the
> portfolio requests Advanced Access. So do Stage 3 first, then request Advanced Access
> on the permissions (Stage 4, "Permissions to request"): Meta answers *"Business
> verification required"* with a **Start verification** link, and the button appears
> here. Seen on The Stellar Crew's portfolio, 2026-09-19.
>
> While in Security Centre: set **two-factor authentication** to required for everyone,
> and **add a second admin** (three with full control at most) so one lost login cannot
> strand the process.

1. **Settings → Business Info → Security Centre** → **Start Verification**
2. Enter the legal details — copied from the documents
3. Upload the supporting documents
4. Choose a confirmation method — email on the company domain, phone call, or SMS
5. Submit and wait

**While it is in review:** change nothing in Business Info. Edits mid-review can reset
or void the submission.

**If rejected:** Meta names the failing field. Almost always a name or address
mismatch, an expired document, or a document type not accepted in your country. Fix
that one thing and resubmit — do not change everything at once, or you learn nothing
from the next rejection.

---

## Stage 3 — Configure the app before submitting for review

At **developers.facebook.com** → your app:

1. **Link the app to the verified business portfolio** — App Settings → Basic →
   *Business Account* → The Stellar Crew. This is the join between the product and the
   verified entity, and Advanced Access is impossible without it. The app keeps the name
   **Sevra**; only the owning business is The Stellar Crew.
2. **Privacy Policy URL**, **Terms of Service URL** and **User data deletion** URL —
   required, must be live. *Sevra's public site does not have these pages yet*; they
   need The Stellar Crew's legal name, country, address and a privacy contact.
3. **App icon**, category, contact email
4. **Valid OAuth Redirect URI** — this exact value, and nothing else is needed:

   ```
   https://ocuicsgffeucdxqyzsai.supabase.co/functions/v1/oauth-relay
   ```

   > One URI covers **every** client, now and in future. Client workspaces each live in
   > their own project with their own callback, and registering those individually would
   > hit Meta's limits. The relay routes each redirect to the right client.

5. **Data Use Checkup** — if prompted, complete it. An overdue checkup blocks review.

---

## Stage 4 — App Review submission

### Permissions to request

Exactly these, and nothing else. Requesting anything "just in case" is a documented
rejection cause.

| Permission | Why Sevra needs it | Where in the product |
|---|---|---|
| `pages_show_list` | List the Pages the admin manages, so they can pick one | Connect flow |
| `pages_read_engagement` | Read comments and reactions on the client's Page posts | Social Intel monitoring |
| `pages_read_user_content` | Read posts by **other people** that tag the Page — the crisis signal | Social Intel monitoring |
| `pages_manage_posts` | Publish an approved statement to the client's Page | Approvals → Publish |
| `instagram_basic` | Read the linked Instagram Business account | Social Intel monitoring |

### Written justification — the pattern that passes

For each permission, answer three things concretely. Generic answers fail.

1. **What the user does** — the literal click path
2. **What the permission enables** — the specific API call
3. **What happens to the data** — where stored, how long, who sees it

**Example — `pages_read_user_content`:**

> Sevra is a crisis communications platform. A communications team connects their
> organisation's Facebook Page in Admin → Social connections. Sevra reads posts that tag
> the Page via the `/tagged` edge every 15 minutes, so the team is alerted when the
> public is discussing an incident involving them. Posts are classified by risk and
> stored in the customer's own isolated database, visible only to that customer's team.
> They are never shared with other customers or third parties.

**Example — `pages_manage_posts`:**

> When an incident occurs, Sevra drafts a holding statement. A team member sends it for
> approval and an administrator approves it. Only then is Publish enabled, which posts
> the approved text to the customer's own Page via `/{page-id}/feed`. Sevra never posts
> without explicit human approval.

### Screencasts — where most submissions die

- **One separate video per permission.** A single video covering several is a documented
  rejection reason.
- Show a **complete flow**: log in → navigate → grant the permission → the feature using
  it → the result.
- Use a **test user who genuinely has an admin role on a real Page.**
- For `pages_manage_posts`, the video **must show a post being published.** A video
  showing only reading gets the permission rejected outright — not downgraded, rejected.
- Screen recording with narration or captions. No edits that skip steps.

### Test credentials

Provide a working login. Reviewers who cannot sign in reject the submission without
assessing it. Use a dedicated account, not a real client's.

---

## Stage 5 — After approval

Set the two secrets. The application code is already written and waiting.

```sh
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref ocuicsgffeucdxqyzsai   # control plane — seeds every future client

# and each workspace that already exists — verified against `supabase projects list`,
# 2026-10-07. Do not copy a ref from an app URL; they do not match.
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref cbkeuuudcqgfpdkwevto   # Arajet (formerly The Stellar Crew's own workspace)
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref bdqjfrahzlcxbtmtlbxl   # Carryt
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref qvkvkgjfnpzdzakhufwv   # Lessence
```

> The ref written here for Lessence until 2026-10-07 was `ftbnhpjapequsqqyakqa`, which
> is not a project in this organisation. Secrets sent there would have gone nowhere and
> the failure would have surfaced as "Connect does nothing" on a client's workspace.

> `PLATFORM_META_CONFIG_ID` (and `_IG_CONFIG_ID`) go with them. They belong to the
> **app**, so switching to a different app means reissuing all of them together.

The Admin panel flips from "register your own developer app" to **Connect** on its own —
the same switch that happened for X. No deploy required.

> Facebook and Instagram share **one** Meta app, so one pair of secrets covers both.

**Verify after setting:** connect a Page on a test workspace, confirm the handle
resolves, confirm a post appears in Social Intel, confirm an approved statement
publishes.

---

## The bridge while you wait

An app in **Development mode** works fully — Advanced Access and all — for anyone holding
a **role on the app itself**.

So for the first clients, before approval:

1. App Dashboard → **App Roles → Roles** → add the client's Facebook user as **Tester**
2. They accept the invitation
3. They press Connect in Sevra and it works, with the real permissions

**This is a bridge, not a destination.** It is manual per client and does not scale past
a handful. But it means Meta's timeline need not block the first customers.

---

## Running a second entity in parallel — Merx LLC

**Revised 2026-10-07, once the relationship was clear: Merx LLC is one of the two
owners of The Stellar Crew LLC.**

That makes Merx a *fallback*, not a parallel race. The first version of this section
assumed two independent companies and recommended submitting both at once; with a
parent and its subsidiary that is worse, not better:

- **It is not an independent second chance.** Same corporate family, overlapping people
  with full control, overlapping documents. That is closer to what Meta's duplicate-app
  detection looks for across portfolios, not further from it.
- **Merx does not operate Sevra — The Stellar Crew does.** A Merx-owned app asserts that
  Merx provides the service. The only truthful fix is to disclose the ownership chain in
  the legal pages, which *adds* entity surface for a reviewer to find a mismatch in, and
  mismatch is the top rejection cause.
- **The tenure clock applies either way**, so it is not faster.

**When Merx is genuinely the right move:** The Stellar Crew is rejected on
*documentation* and Merx has what it lacks — an older registration, a business bank
statement, a utility bill at an address matching the registration. That is a real
reason. "Two chances" is not.

**So the order is:** find out why The Stellar Crew is sitting in review before preparing
anything under Merx. Approved ends this. Rejected names a field, and only then is it
worth asking whether Merx's documents answer that specific field better.

### If Merx is used anyway — the rule that makes it legitimate

**App Review approves a use case, not just an app.** Permissions are granted against the
product you demonstrated in the screencasts. So the Merx app must be reviewed showing
*Sevra* — the same connect flow, the same monitoring, the same approve-then-publish.

Getting an app approved for some other purpose and repointing it at Sevra afterwards is
app-purpose misrepresentation. It breaches Platform Terms and is one of the faster ways
to lose an app, and every connection made through it. **If it is not a Sevra submission,
it is not reusable here.** That is the whole condition.

### What must be identical between the two submissions

- The permission list — `pages_show_list`, `pages_read_engagement`,
  `pages_read_user_content`, `pages_manage_posts`, `instagram_basic`
- The written justifications (Stage 4)
- The screencasts — one per permission, showing the real product
- The relay redirect URI, which is the same for every app and every client:
  `https://ocuicsgffeucdxqyzsai.supabase.co/functions/v1/oauth-relay`
- The app name `Sevra`, so the consent screen reads the same whoever owns it

### What must differ

- The business portfolio and every verification document — Merx LLC's registered name
  and address, character for character, per Stage 0
- The App ID, secret, and login configuration IDs, which belong to the app

### The part that is not paperwork: who operates Sevra

For an app touching **other businesses'** Pages, Meta treats the owning entity as the
one providing the service. Sevra's legal pages currently say otherwise:

```
src/i18n/messages/legal.ts
  const COMPANY = "The Stellar Crew LLC"
  const ADDRESS = "18482 Kuykendahl Rd Unit #517, Spring, TX 77379, USA"
```

Those two constants feed the English and Spanish privacy policy, terms and
data-deletion pages — the pages a reviewer opens from the app listing. A reviewer who
follows that link from a **Merx-owned** app finds a different company operating the
service, which is the same class of mismatch that causes most verification rejections,
and afterwards is a data-controller question rather than a review question.

**Today this is correct and needs no change**: The Stellar Crew LLC does operate Sevra.
It only becomes wrong if a **Merx-owned** app ships, and then the accurate wording is
the ownership chain — Sevra operated by The Stellar Crew LLC, part-owned by Merx LLC —
not a swap of one name for the other, which would be false.

Note what that costs: the privacy policy stops naming one company and starts explaining
a corporate structure, on the page a reviewer opens first. That is a reason to prefer
keeping the app under the operating entity unless documentation forces the switch.

### Do not

- Submit under both entities **at the same time**. Meta flags near-duplicate apps across
  portfolios, and two portfolios owned by the same people make that more likely, not
  less. One under review at a time, and only after the first has actually failed.
- Create a Merx portfolio and expect to submit immediately. Portfolio tenure is
  30 days–3 months and the clock only starts when the portfolio exists. Create it now
  even if the submission waits.
- Edit Business Info on either portfolio while its verification is in review.

### Switching Sevra to whichever app wins

No code change. Set `PLATFORM_META_CLIENT_ID`, `_SECRET`, `_CONFIG_ID` and
`_IG_CONFIG_ID` per Stage 5, on the control plane and every workspace.

With `PLATFORM_META_CONFIG_ID` unset the connect start falls back to sending a scope
list instead (`social-oauth-start/index.ts`), so an app without Facebook Login for
Business still works.

> **Tokens are app-bound.** Switching apps invalidates every connected Facebook and
> Instagram account and forces a reconnect. That cost is zero today because nobody is
> connected — it stops being zero the moment a client connects a Page, which is the
> argument for settling the entity question before onboarding anyone onto Meta.

---

## Rejection quick reference

| Symptom | Cause | Fix |
|---|---|---|
| Verification rejected, no detail | Name or address mismatch | Copy character-for-character from the legal document |
| Documents "do not match the business" | Portfolio named after the product | The portfolio is **The Stellar Crew**; only the app is named Sevra |
| Document rejected | Type not accepted in your country, or older than 12 months | Check the country list in the flow |
| Cannot start verification | Portfolio too new, or too many full-control admins | Wait out the tenure; reduce to three admins |
| `pages_manage_posts` rejected | Screencast showed only reading | Re-record showing a post being published |
| All permissions rejected at once | One video covered several permissions | One video per permission |
| Reviewer "could not access the app" | Test credentials missing or broken | Provide a working login and verify it yourself first |

---

## Status

- [x] Business portfolio created **in The Stellar Crew's legal name** — **start the tenure clock**
- [x] Documents collected, all in The Stellar Crew's name, address identical across all
- [x] Business Verification submitted (The Stellar Crew) — **in review since 2026-09-19**
- [ ] Business Verification approved
- [ ] Find out *why* The Stellar Crew is still in review — approved, rejected with a
      named field, or merely slow. Everything below depends on the answer
- [ ] **Merx LLC**: portfolio created (starts the tenure clock — worth doing now even
      though the submission waits; nothing shortens it later)
- [ ] Only if The Stellar Crew is rejected on documents: check whether Merx's documents
      answer that specific field better
- [ ] Only if switching to Merx: ownership-chain wording in `legal.ts` before submitting
- [ ] App linked to verified portfolio; privacy policy, ToS, relay URI set
- [ ] Screencasts recorded — one per permission
- [ ] App Review submitted
- [ ] Advanced Access granted
- [ ] `PLATFORM_META_*` promoted from bridge to general availability
- [ ] One-click verified end to end on a test workspace

**Where the secrets actually are, as of 2026-09-20.** `PLATFORM_META_CLIENT_ID`,
`_SECRET`, `_CONFIG_ID` and `_IG_CONFIG_ID` are set on the control plane and on both
client workspaces, deliberately, as the development-mode bridge described above: an
unreviewed app works for people who hold a role on it, which covers the first few
clients while review runs. Because a provisioned client inherits every `PLATFORM_*`
secret from the control plane, **new clients now inherit this app too** — and for a
client whose staff are not testers on it, Facebook and Instagram connect will fail
rather than fall back. Either add each new client's admin as a tester, or clear the
Meta pair from the control plane until Advanced Access is granted.

---

**Sources**
[Meta verification documents](https://singhamandeep.com/meta-business-verification-documents-required/) ·
[Page API permissions review](https://singhamandeep.com/facebook-page-api-permissions-app-review/) ·
[Screencast requirements](https://singhamandeep.com/meta-app-review-screencast-why-your-demo-video-gets-rejected-2026/) ·
[Advanced Access](https://singhamandeep.com/what-is-meta-advanced-access/) ·
[20-day timeline](https://bundle.social/blog/meta-app-review-20-days) ·
[Verification "In Review" delays](https://communityforums.atmeta.com/discussions/Questions_Discussions/business-verification-in-review-10-days-%E2%80%94-blocking-app-review-submission/1372323)
