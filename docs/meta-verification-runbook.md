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
  --project-ref ocuicsgffeucdxqyzsai   # seeds every future client

# and each workspace that already exists — at the time of writing:
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref cbkeuuudcqgfpdkwevto   # The Stellar Crew's own workspace
supabase secrets set PLATFORM_META_CLIENT_ID=<app id> PLATFORM_META_CLIENT_SECRET=<app secret> \
  --project-ref ftbnhpjapequsqqyakqa   # Lessence
```

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

- [ ] Business portfolio created **in The Stellar Crew's legal name** — **start the tenure clock**
- [ ] Documents collected, all in The Stellar Crew's name, address identical across all
- [ ] Business Verification submitted
- [ ] Business Verification approved
- [ ] App linked to verified portfolio; privacy policy, ToS, relay URI set
- [ ] Screencasts recorded — one per permission
- [ ] App Review submitted
- [ ] Advanced Access granted
- [ ] `PLATFORM_META_*` set on both projects
- [ ] One-click verified end to end on a test workspace

---

**Sources**
[Meta verification documents](https://singhamandeep.com/meta-business-verification-documents-required/) ·
[Page API permissions review](https://singhamandeep.com/facebook-page-api-permissions-app-review/) ·
[Screencast requirements](https://singhamandeep.com/meta-app-review-screencast-why-your-demo-video-gets-rejected-2026/) ·
[Advanced Access](https://singhamandeep.com/what-is-meta-advanced-access/) ·
[20-day timeline](https://bundle.social/blog/meta-app-review-20-days) ·
[Verification "In Review" delays](https://communityforums.atmeta.com/discussions/Questions_Discussions/business-verification-in-review-10-days-%E2%80%94-blocking-app-review-submission/1372323)
