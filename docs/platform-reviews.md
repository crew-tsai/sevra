# Platform reviews

What each social platform has actually approved, what is gated behind a review still
running, and exactly what changes when one is granted.

This file exists because **a connection working in Sevra's own workspace proves nothing
about a client's.** Meta and TikTok both let an unreviewed app work for people who hold a
role on that app — which is every test we can run ourselves. The first client whose staff
are not on the app is where an unreviewed permission actually fails, and by then it fails
in front of them.

Keep the status table current. It is the only place that says what a new client can
expect on their first day.

---

## Status

| Platform | App | Works today | Gated on review | Since |
|---|---|---|---|---|
| **X** | Sevra's | Connect, publish, and monitoring without any client auth | Nothing — X needs a paid tier, not a review | live |
| **Meta** (Facebook + Instagram) | Sevra's, unreviewed | Connect and publish **only** for people with a role on the app | Advanced Access: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_posts` | Business Verification submitted 2026-09-19, in review |
| **TikTok** | Sevra's, sandbox | Connect and read the account's basic profile (`user.info.basic`) | Login Kit in production; publishing and comment reading are separate products | not yet submitted |

Sevra's own workspace, for reference: X, Facebook, Instagram and TikTok all show
`connected`. That is the dev-mode bridge working as designed, not evidence of approval.

---

## Meta

Process, documents and the screencast rules: [`meta-verification-runbook.md`](meta-verification-runbook.md).

**Where it stands.** Business Verification is in review. App Review cannot be submitted
until it clears. The code is finished and waits on nothing but the grant.

**What the bridge costs.** `PLATFORM_META_CLIENT_ID`, `_SECRET`, `_CONFIG_ID` and
`_IG_CONFIG_ID` are set on the control plane, and a provisioned client inherits every
`PLATFORM_*` secret from there. So a new client is handed Sevra's unreviewed Meta app,
and their Facebook connect **fails** rather than falling back to asking for their own
credentials — unless their admin is added as a Tester on the app first.

Two ways to handle it, and the choice is per onboarding rather than permanent:

- **Add the client's admin as a Tester** on the Meta app. Fine for the first few clients,
  and it keeps one-click connect working for them.
- **Clear the Meta pair from the control plane** until Advanced Access is granted. New
  clients then see the "enter your own Meta app" path, which needs no review at all
  because their own app acts on their own Pages.

Whichever you pick, say which in the onboarding notes for that client, because the two
produce very different first-day experiences.

---

## TikTok

### Sandbox and production are different apps

Separate credentials, separate URL properties, separate Login Kit configuration. A sandbox
app works **only** for accounts explicitly added as target users on it. Everything
currently connected runs through the sandbox, so nothing about it predicts a client's
experience.

The site-verification file for the URL property lives at
[`public/tiktokA0awsZLHMiyxXaQwVGGDJokpoxQvrQGt.txt`](../public/tiktokA0awsZLHMiyxXaQwVGGDJokpoxQvrQGt.txt)
and must keep being served from the app's root domain, or the property unverifies and the
app's URLs stop being accepted.

### What is asked for today

`PLATFORM_TIKTOK_SCOPE` defaults to `user.info.basic` — the one scope an unreviewed app
may request. Widening it before the matching product is approved makes the authorization
screen fail rather than asking for more.

### Two submissions, not one

**1 — Login Kit, in production.** Unlocks connecting a client's own TikTok account and
showing which account is connected. This is the submission to make first: it is what the
product already does, and the demo video shows exactly that.

What the reviewer needs to see: an operator opening Admin → Social connections, choosing
TikTok, completing TikTok's own consent screen, and landing back in Sevra with the account
named on screen. Nothing else in the product needs to appear.

Explanation text to submit with it:

> Sevra is a crisis communications tool for companies that must respond publicly when
> something goes wrong. An administrator connects their organisation's own TikTok account
> so the platform can show which account is linked and, once approved for posting, publish
> the statements their team has already written and approved. We request
> `user.info.basic` only: it returns the account's identifier, display name and avatar,
> which is what lets the person confirm they connected the right account and what the
> workspace displays beside the connection. We do not read the account's videos, we do not
> search or collect TikTok content, and no data from TikTok is used for advertising,
> profiling, or shared with any third party. Access is limited to administrators of the
> company's own workspace, and disconnecting revokes the token immediately.

**2 — Publishing and comments, later.** `video.publish` / `video.upload` and the comment
products. Do not submit these together with Login Kit: one video covering several
permissions is a common rejection.

**Open design question, and it is not a paperwork one.** The Content Posting API takes a
**video file**. Sevra writes a script. Approving "publish to TikTok" therefore does not
finish the feature — something has to produce the video, whether that is the client
uploading one against the approved script (already supported on TikTok assets) or Sevra
generating it. Decide that before submitting, because the demo video has to show the real
flow.

### What nobody can do

TikTok offers **no** way to search the platform for mentions outside its academic research
programme. Monitoring TikTok is not pending review — it is not available. The product says
so in the Help page and must keep saying so.

---

## When an approval lands

For either platform, in this order:

1. **Set the credentials on the control plane**, not on a client:
   `supabase secrets set --project-ref ocuicsgffeucdxqyzsai PLATFORM_<X>_...`.
   Every `PLATFORM_*` secret there is inherited by each client provisioned afterwards.
2. **Bring existing clients along.** Their edge functions read the secret at call time, so
   no redeploy is needed — but any client whose secret was set by hand earlier now has a
   value that disagrees with the control plane. Check before assuming.
3. **Widen the scope** if the grant included one (`PLATFORM_TIKTOK_SCOPE` for TikTok).
   Existing connections keep the scopes they were issued with; they must reconnect.
4. **Reconnect one account end to end** in a workspace that is *not* ours, or on an account
   with no role on the app. That is the only test that distinguishes a real grant from the
   dev-mode bridge.
5. **Update the status table at the top of this file**, and the TikTok or Meta section of
   the [README](../README.md).

Changing which app a network uses invalidates every account already connected through the
old one — tokens are app-bound and cannot be refreshed or revoked by another app. Saving or
clearing credentials flips that connection to `error` with a message telling the admin to
reconnect, deliberately, rather than letting it fail later mid-incident.
