# Merx LLC — Meta submission pack

Everything needed to fill the forms, in the order the forms ask for it. Strategy and
background live in [meta-verification-runbook.md](meta-verification-runbook.md); this is
the copy-paste layer.

> **The one rule behind all of it:** every character you type must match the documents
> you upload. Copy from the document into Meta, never the reverse.

---

## 1. Entity facts

Verified against the Florida Division of Corporations record and the 2026 Annual Report
(filed 16 Apr 2026, document `9730531082CC`).

| Field | Value |
|---|---|
| Legal business name | `MERX LLC` |
| Entity type | Limited Liability Company |
| State of formation | Florida, United States |
| Document number | `L16000159405` |
| Date filed | 25 August 2016 |
| Effective date | 1 September 2016 |
| Status | ACTIVE |
| Tax ID (FEI/EIN) | on the CP 575 notice and the annual report |
| Signing officer | Ronald Ayala, President |
| Other authorized person | Daniela Restrepo Cardona, AMBR |

**Business address — use this one:**

```
3422 Red Candle Dr
Spring, TX 77388
United States
```

**Not** the Fort Lauderdale address, and **not** the Pompano Beach address on the CP 575.
Reasoning in §2.

**Also required, and commonly overlooked:**

- Business email **on the company domain** — `@merxcorp.com`. A Gmail address fails.
- Business phone that is actually answered. Meta may call or text to confirm.
- A live website describing the business.

---

## 2. Documents — what to upload, what to hold back

Four addresses exist across the available documents. That is the whole difficulty, and
the fix is to submit only the ones that agree.

| Document | Address it shows | Use it? |
|---|---|---|
| 2026 Annual Report | Principal: Fort Lauderdale FL · **Mailing: Spring TX** | **Yes** — registration |
| Business bank statement | **Spring TX** | **Yes** — address proof, the strongest document |
| Certificate of Status | n/a (good standing) | **Yes** if ordered (~$5) |
| IRS CP 575 (EIN notice) | Pompano Beach FL, 2016 | **Hold back** |

**Why the bank statement leads.** It is third-party evidence in the company's name. A
utility bill cannot replace it here: the address is residential, so any utility account
is in a personal name and would not match `MERX LLC` at all.

**The CP 575 is the IRS SS-4 EIN Assignment Letter, and Meta marks it Recommended.**
This pack originally said to hold it back, on the grounds that its 2016 Pompano Beach
address agrees with nothing. That was wrong, because the upload step is split in two and
they ask different questions:

- **Verify legal business name** — the document must carry the legal name and not be
  expired. The CP 575 is ideal here: government-issued, names `MERX LLC`, never expires.
  Meta lists it as *Recommended*, alongside the IRS 147c.
- **Verify address or phone number** — the document must carry the legal name *and* the
  address or phone you entered. This is the bank statement's job, or the annual report's.

So the address on the CP 575 never comes into it. Use it for the name, and something
carrying the Spring TX address for the address.

It remains irreplaceable: the notice states it is issued once and the IRS will not
reissue it, and Form 8822-B updates their record without producing a new one. Keep the
file safe.

**Format:** PDF or clear image, each under 8 MB.

### Optional: amend the state record

The annual report says Principal Place of Business is Fort Lauderdale while the bank says
Spring, TX. Both addresses are on the filing, so the submission stands up as-is — a
Florida LLC operating from Texas is ordinary, and Meta has no concept of Florida's
statutory distinction between principal office and mailing address.

Filing an amended annual report (~$50) to change the principal address to the Texas one
removes the last thing a reviewer could misread. It is insurance, not a requirement.
Registered agent stays in Florida — that is a state requirement, not an inconsistency.

---

## 2b. Two traps in the verification wizard

Both hit on 2026-10-07, both silent.

**Public records contain a second company called Merx LLC.** The "Select your business"
step offered four matches. Two carried an EIN ending `05` — a different legal entity —
and one of those listed the Red Candle Dr address, which makes it the tempting pick.
Only records whose EIN ends `31` are ours. None matched exactly: the one carrying our
EIN *and* both principals listed Red Candle Dr as **Spring, FL**, which is wrong.
Choosing *My business isn't listed* is the sanctioned answer when the details are
incorrect, and it routes to document upload, which is cleaner than attaching the
portfolio to someone else's company. **Check the EIN before selecting any record.**

**The wizard silently changed the state to FL.** After choosing *My business isn't
listed*, the Upload documents header read `3422 RED CANDLE DR, SPRING, FL 77388` — the
bad state carried over from that public record, against a Texas ZIP. Documents would
have been checked against Florida while every one of them says Texas. Going back to
*Add business details*, re-entering `TX`, and coming forward again fixed it. **Read the
header on the upload screen before attaching anything** — it is the contract the
documents are compared against.

## 3. Business portfolio

1. **business.facebook.com** → create the portfolio in the name `MERX LLC`
2. **Settings → Business Info** — fill every field from §1
3. Confirm admin / full control
4. **Security Centre** — require two-factor for everyone, and add a second admin so one
   lost login cannot strand the process. Keep full-control admins to **three or fewer**
5. Leave Business Info alone afterwards. There is an edit limit, and exceeding it blocks
   verification

> **Tenure did not apply.** The runbook records a 30-day–3-month portfolio age
> requirement before verification can be requested. That did **not** hold here: the
> Merx portfolio was created on 2026-10-07 and Security Centre showed *"Eligible for
> verification"* the same day, under the use case *App requires access to permissions on
> Meta for Developers*. Do not plan a month of waiting around that claim — open Security
> Centre and look.

---

## 4. App configuration

### The two Sevra apps — keep them straight

There are now two apps named `Sevra`, one per entity. The display name is deliberately
the same (it is what clients read on the consent screen); the IDs are how you tell them
apart.

| | Owner | App ID | Login config |
|---|---|---|---|
| Original | The Stellar Crew | `1086614267426288` | `1768401581038390` |
| **Merx** | Merx LLC | `1422580146676547` | `3156875411370865` |

The Merx configuration, created 2026-10-07: user access token, General login variation,
four Page permissions. Its ID becomes `PLATFORM_META_CONFIG_ID` on switchover — together
with that app's client ID and secret, which must change in the same breath. Mixing a
config ID from one app with credentials from the other fails at the consent screen.

> **User access token, not system-user** — chosen deliberately and not changeable.
> `social-oauth-callback/index.ts` calls `/me/accounts` with the user token and reads
> `page.access_token` out of it, which is the user-token → Page-token exchange. A
> system-user configuration would require each client to stand up their own business
> portfolio and assign Page assets before connecting, which is the developer-portal
> homework the one-click design exists to remove.

### The rest

The **Start Verification** button does not appear until an app linked to the portfolio
requests Advanced Access. So the app comes first, then Advanced Access, then verification.

1. **App Settings → Basic → Business Account** → `MERX LLC`
2. App name stays **Sevra** — that is what clients read on the consent screen
3. Privacy Policy, Terms of Service and User Data Deletion URLs — must be live, and must
   name an entity consistent with the app owner. See §7
4. App icon, category, contact email
5. **Valid OAuth Redirect URI** — this exact value, and nothing else:

   ```
   https://ocuicsgffeucdxqyzsai.supabase.co/functions/v1/oauth-relay
   ```

   One URI covers every client, now and in future. Each client workspace has its own
   callback; the relay routes to the right one. Registering them individually would hit
   Meta's limits.
6. Complete the **Data Use Checkup** if prompted. An overdue checkup blocks review.

> **Order matters, and the UI does not say so.** A login configuration can only offer
> permissions the *use case* has already enabled. Creating the configuration first shows
> a near-empty permission list — only `pages_show_list` and `business_management` — and
> searching for the others finds nothing. Customize the use case first
> (**Use cases → Manage everything on your Page → Customize**), add the four permissions
> there, then create the configuration. App-level settings such as the redirect URI
> survive, so nothing is lost by hitting this in the wrong order.
>
> Do **not** take `business_management` while you are in that list. It grants read and
> write on the Business Manager API, Sevra uses none of it, and an unused broad
> permission is a rejection cause.

---

## 5. Permission justifications

Request exactly these five. Asking for anything "just in case" is a documented rejection
cause.

Each answer names what the user does, what the permission enables, and what happens to
the data. Generic answers fail.

### `pages_show_list`

> Sevra is a crisis-communications platform for corporate communications teams. An
> administrator opens Admin → Social connections and chooses Connect for Facebook. Sevra
> calls `/me/accounts` to list the Pages that person manages, so they can select which of
> their organisation's Pages Sevra should monitor. Only the Page name and ID are shown,
> only to that administrator, and the selection is stored in that customer's own isolated
> database.

### `pages_read_engagement`

> Once a Page is connected, Sevra reads comments and reactions on that Page's own posts
> every 15 minutes, so a communications team sees public reaction building on their own
> content before it becomes an incident. Each item is classified for risk by an automated
> analysis step and stored in the customer's own isolated database, visible only to that
> customer's team. It is never shared with other customers or third parties.

### `pages_read_user_content`

> This is the core crisis signal. Sevra reads posts by **other people** that tag the
> customer's Page, via the `/tagged` edge, every 15 minutes. That is how a communications
> team learns the public is discussing an incident involving them — a service failure, a
> safety event, an accusation — while they can still respond. Posts are classified by
> risk, grouped into incidents, and stored in the customer's own isolated database,
> visible only to that customer's team, for a retention period the customer sets.

### `pages_manage_posts`

> When an incident is detected, Sevra drafts a holding statement. A team member sends it
> for approval; an administrator reviews and approves it. Only then does Publish become
> available, which posts the approved text to the customer's own Page via
> `/{page-id}/feed`. Sevra never posts without explicit human approval, and the approval
> is recorded in an audit log with who approved it and when.

### `instagram_basic`

> Where the customer's Page has a linked Instagram Business account, Sevra reads that
> account's profile and media so the same monitoring covers Instagram as well as
> Facebook. A crisis rarely stays on one network, and a communications team needs both in
> one timeline. The data is stored in the customer's own isolated database and is never
> shared.

---

## 6. Screencasts

**One video per permission.** A single video covering several is a documented rejection
reason — and it fails *all* of them, not just one.

Each video shows a complete flow: sign in → navigate → grant the permission → the feature
using it → the result. Screen recording with narration or captions. No cuts that skip
steps.

| Permission | The video must show |
|---|---|
| `pages_show_list` | Admin → Social connections → Connect → Facebook consent → **the list of Pages appearing** → selecting one |
| `pages_read_engagement` | A connected Page with real comments/reactions → Social Intel → **those items appearing in the feed** with risk classification |
| `pages_read_user_content` | A third-party post tagging the Page → the monitor run → **that post appearing in Social Intel** → it opening or joining an incident |
| `pages_manage_posts` | Incident → draft statement → send for approval → approve → Publish → **the post appearing live on the Facebook Page** |
| `instagram_basic` | A linked Instagram Business account → its content appearing in Social Intel |

> **`pages_manage_posts` is where submissions die.** A video showing only reading gets the
> permission **rejected outright**, not downgraded. It must show a post actually being
> published and then visible on the Page.

Use a test user who genuinely holds an admin role on a real Page. A reviewer who cannot
reproduce what the video shows rejects the submission.

---

## 7. Test credentials for the reviewer

Reviewers who cannot sign in reject without assessing. Provide:

- A **dedicated Sevra account** — never a real client's workspace
- A Facebook test user with an **admin role on a real Page** that has some public activity
- Step-by-step sign-in instructions, written for someone who has never seen the product
- Verify the credentials yourself, from a logged-out browser, immediately before
  submitting

---

## 8. Legal pages — decide before submitting

Sevra's privacy policy, terms and data-deletion pages are generated from two constants:

```
src/i18n/messages/legal.ts
  const COMPANY = "The Stellar Crew LLC"
  const ADDRESS = "18482 Kuykendahl Rd Unit #517, Spring, TX 77379, USA"
```

A reviewer opens those pages from the app listing. Under a **Merx-owned** app they would
find a different company named as operator — the same class of mismatch that causes most
rejections, and a data-controller question afterwards.

Merx LLC is one of the two owners of The Stellar Crew LLC, so the accurate fix is to
disclose the chain, **not** to swap one name for the other, which would be false:

> Sevra is a crisis-communications platform operated by The Stellar Crew LLC, a Texas
> limited liability company, part-owned by Merx LLC, a Florida limited liability company.

**Not yet applied** — this is a statement about the companies and needs sign-off before it
goes on a public legal page. Apply it before the Merx app is submitted for review, not
after.

---

## 8b. Status

| | |
|---|---|
| Merx portfolio | created 2026-10-07 · ID `1118989097142108` |
| App | `1422580146676547`, linked to Merx LLC |
| Login configuration | `3156875411370865` · user access token · 4 Page permissions |
| Redirect URI | registered, Strict Mode on |
| **Business Verification** | **submitted 2026-10-07** |
| Documents submitted | CP 575 (name) · address document (Spring TX) |
| App Review | not started — needs the five screencasts |

The Stellar Crew's verification was still *In Review* at the time of submitting, 18 days
in. Two verifications are now open across two portfolios controlled by the same people.
That is tolerable while only one **app** is under review — App Review is where
near-duplicate apps get flagged — but do not submit both apps.

**While it is in review: change nothing in Business Info.** Edits can reset or void the
submission.

## 9. Order of operations

1. [ ] Order a **Certificate of Status** from Sunbiz (~$5)
2. [ ] *(Optional)* File the amended annual report moving Principal Place of Business to
       the Texas address
3. [ ] **Create the Merx business portfolio** — starts the tenure clock, do this first
       regardless of everything else
4. [ ] Enable two-factor; add a second admin
5. [ ] Settle the legal-pages wording (§8) and ship it
6. [ ] Record the five screencasts (§6) — the long pole, start early
7. [ ] Prepare and verify reviewer test credentials (§7)
8. [ ] Once tenure clears: link the app to the portfolio, request Advanced Access
9. [ ] Meta answers "Business verification required" → **Start verification** → submit §1
       and §2
10. [ ] After verification: submit App Review with §5 and §6
11. [ ] After approval: set `PLATFORM_META_*` per Stage 5 of the runbook, then verify a
        Connect end to end

> **One under review at a time.** If The Stellar Crew's verification is still open when
> Merx is ready, let it settle or withdraw it first. Meta flags near-duplicate apps across
> portfolios, and two portfolios controlled by the same people make that more likely.
