# Sevra — AI-Powered Crisis Communications Platform

Sevra is an AI-driven crisis communications platform for organizations that have to answer publicly when something goes wrong — transportation operators, healthcare providers, financial institutions, utilities, retailers, public agencies and more. It ingests social media mentions and manual reports, uses AI to triage them into structured incidents with risk scoring, generates a full communication asset package, gates publication behind a two-stage approval workflow, and maintains an append-only audit trail.

The workspace retunes itself to the customer: setting the industry in Admin → Company changes the incident field labels (a rail operator is asked for a *train number* and *station code*; a hospital for a *case ID* and *facility*), swaps the incident sub-type taxonomy (an airline files a *baggage system failure*, a hospital a *medication error*, a bank a *payments outage*), and briefs the AI that classifies mentions and drafts communications.

Transportation is listed per mode because an airline and a shipping line genuinely differ in vocabulary; other sectors are listed per sector. This is all presentation and prompting: `incident_type` stays fixed to five values by a CHECK constraint and `sub_type` is free text, so adding an industry needs no migration.

---

## Deployment model

**One deployment per client.** Each customer runs in their own Supabase project and their own database. A company's data is isolated structurally, not by policy — a misconfigured rule cannot leak one operator's unpublished holding statement to another, because they do not share a database.

The trade-off is that no single place shows the client portfolio. That is what the separate [control plane](https://github.com/crew-tsai/sevra-console) is for: each deployment reports **metadata only** (company name, industry, counts, health) to a central registry. Incident content never leaves the client's database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Database | PostgreSQL 17 via Supabase (one project per client) |
| Auth | Supabase GoTrue (email + password, JWT) — **invite-only** |
| RBAC | `user_roles` table + RLS policies (`admin`, `coordinador`, `manager`, `ejecutivo`, `soporte`) |
| REST API | Supabase PostgREST |
| Edge Functions | Deno (19 functions) |
| AI | Google Gemini direct — `gemini-3.8-flash`, `gemini-3.1-flash-image` (see [`_shared/ai.ts`](supabase/functions/_shared/ai.ts)) |
| Email queue | pgmq + pg_cron + Resend |
| Scheduler | pg_cron — `sevra-social-monitor-15min`, `process-email-queue-5s`, `sevra-deployment-heartbeat-15min` |

> Only `admin` currently changes what a user can do. `coordinador`, `manager` and `ejecutivo` are recorded against each person but do not yet restrict anything, and every signed-in user can read the workspace. `soporte` marks Sevra staff (see [Support access](#support-access)).

---

## Features

- **SEVRA Social Intel** — Pulls real mentions from connected X and Facebook accounts. AI classifies risk, suggests incident type, and deduplicates against existing incidents. Instagram and TikTok can be AI-simulated for demos, but `company_settings.simulation_enabled` defaults to **false**: synthetic mentions become real incident rows and are indistinguishable from genuine ones once created, which is not something a client should get by default
- **Incident Management** — Create, update, and track incidents with crisis level (L0–L4), risk score, and approval status
- **Assets** — Auto-generated communication assets: press releases, holding statements, social posts, internal memos, Q&As, FAQs. Instagram and TikTok assets can carry an uploaded image/video, or an AI-generated image
- **Approvals** — Two-stage workflow: a team member sends a draft forward, an admin gives final approval. Approved assets unlock email, direct social publishing, and WhatsApp
- **Social connections** — OAuth to the operator's own X, Facebook, Instagram and TikTok accounts. X and Facebook publish directly; Instagram and TikTok fall back to copy-and-open because those platforms require media on every post
- **Reports** — Analytics and incident reporting
- **Audit Log** — Append-only log of incident field changes, plus a record of every Sevra support access
- **Admin Panel** — Company profile, branding, team & roles, email lists, responsibility matrix, social connections
- **Agent Stripes** — AI assistant chat, grounded in the workspace's live data

> **Workflows** (sidebar) is an unfinished preview. It operates on a hardcoded in-memory array: rules defined there are not persisted and nothing in the incident pipeline consults them.

---

## Project Structure

```
src/
  pages/          # Route-level page components
  components/     # Shared UI components
  integrations/   # Supabase client + generated types
  hooks/          # Custom React hooks
  lib/            # Utilities, industry profiles, distribution helpers
supabase/
  functions/      # 19 Deno edge functions
  migrations/     # PostgreSQL migrations (chronological)
  seed.sql        # Optional demo data, airline-flavored — never runs automatically
```

---

## Provisioning a new client

**This is automated.** Staff create an invitation in the [control plane](https://github.com/crew-tsai/sevra-console); the client clicks the link and everything below happens on its own in about four minutes — Supabase project, schema, edge functions, secrets, cron wiring, Vercel frontend. The manual sequence is kept for reference and for deployments created by hand.

Each client gets their own Supabase project. Run these in order; **step 4 is required** or nobody, including the client, can create an account.

```bash
# 1. Link to the client's new project
supabase link --project-ref <client-project-ref>

# 2. Apply the schema
supabase db push

# 3. Deploy the edge functions
supabase functions deploy

# 4. REQUIRED — designate who may claim the admin role.
#    Signup is invite-only and fails closed: until this is set, registration
#    is rejected for everyone. This is what prevents a stranger who finds the
#    URL from claiming the client's workspace first.
supabase db query --linked \
  "update public.bootstrap_config set bootstrap_admin_email = 'admin@clientcompany.com' where id = 1;"

# 5. Set the deployment's secrets (see table below)
supabase secrets set SITE_URL=https://<client-app-domain>

# 6. Optional — report into the control plane
supabase secrets set \
  CONTROL_PLANE_URL=https://<control-plane-ref>.supabase.co \
  HEARTBEAT_SECRET=<shared secret>
```

The client's admin then signs up with the designated address, opens **Admin**, and clicks **Claim admin role**. That whole path is verified end to end: a stranger who finds the URL is refused by the invite-only trigger, the designated address is accepted, and the claim grants the role. From that point they invite their own team — an invitation both permits registration and assigns the role automatically on signup.

An end-user walkthrough for the client's administrator is kept separately as the **Sevra Readiness Guide**.

### Secrets

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio key: analysis, asset generation, Agent Stripes, monitoring |
| `RESEND_API_KEY` | Yes | Transactional email delivery |
| `EMAIL_WEBHOOK_SECRET` | No | Verifies the provider's bounce/complaint webhook. Unset ⇒ the endpoint refuses everything |
| `SITE_URL` | Yes | Public app origin; used to build the OAuth return URL |
| `CONTROL_PLANE_URL` | No | Control plane project URL. Unset ⇒ the deployment does not report |
| `HEARTBEAT_SECRET` | No | Shared secret authenticating the heartbeat |
| `PLATFORM_X_CLIENT_ID` / `_SECRET` | No | Sevra's X app. Unset ⇒ X connects only with the client's own app |
| `PLATFORM_META_CLIENT_ID` / `_SECRET` | No | Sevra's Meta app, shared by Facebook **and** Instagram |
| `PLATFORM_TIKTOK_CLIENT_ID` / `_SECRET` | No | Sevra's TikTok app |
| `SENDER_DOMAIN` | No | Verified sending subdomain, e.g. `notify.client.com`. Unset ⇒ Sevra's |
| `FROM_DOMAIN` | No | Domain in the `From:` header, e.g. `client.com` |
| `SITE_NAME` | No | Overrides the `From:` display name; defaults to the workspace's company name |
| `ANTHROPIC_API_KEY` | No | Only `generate-response-plan`, which runs on Claude. Unset ⇒ that one endpoint 500s; nothing else is affected |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically.

### Who transactional email comes from

Resolved at send time by [`_shared/sender-identity.ts`](supabase/functions/_shared/sender-identity.ts),
in this order:

| | Display name | Address |
|---|---|---|
| Nothing configured | the workspace's own company name | `noreply@notify.thestellar.ai` |
| Client verified their domain | the workspace's own company name | `noreply@<their subdomain>` |
| `SENDER_DOMAIN` / `SITE_NAME` set | the env value | the env value |

**No setup is required to send as the client.** Proving you own a domain means proving
control of its DNS and no provider lets anyone skip that — but a *display name* needs no
proof, and it is what a recipient reads in their inbox list. So mail arrives from
`Acme Corp <noreply@notify.thestellar.ai>` rather than from the client's software vendor,
from the first day.

Verifying their own domain is an upgrade, and it is self-service: **Admin → Email lists →
Sending domain**. The client types a subdomain, gets the DNS records with copy buttons,
and presses Check again. Until it verifies, mail keeps going out under Sevra's domain, so
nothing breaks while DNS propagates. Root domains are refused — a company's root carries
the MX records its own email runs on.

Why the address matters at all, given the name is already right: these go to journalists
and regulators. An unfamiliar sending domain mailing press lists is the shape of phishing,
and a reporter checking authenticity sees a third party. It is also shared reputation —
spam complaints against one client degrade deliverability for every other, including
crisis statements, at the moment they matter most.

The provider key that can create and delete domains lives on the control plane, never in a
client project: one compromised client must not be able to unverify another's domain. The
client's app relays over the shared-secret channel it already uses for heartbeats.

Unset falls back to Sevra's domain, which is correct for a client who hasn't verified
theirs yet: mail still sends, it just isn't branded to them.

The client's Google Workspace (or whatever hosts their human mailboxes) is unaffected —
only DKIM/SPF records on the sending **subdomain** are involved, never the root domain's MX.

### Which developer app a social connection uses

Two sources, resolved in [`_shared/social-credentials.ts`](supabase/functions/_shared/social-credentials.ts):

1. **The client's own app** — entered in Admin → Social connections, stored in `social_app_credentials`.
2. **Sevra's shared app** — the `PLATFORM_*` secrets above, seeded automatically at provisioning.

The client's own app **always wins** when present. That ordering is deliberate: an admin who registered their own app did so for their own API quota and their own name on the OAuth consent screen, and must not be silently moved onto the shared app, whose rate limit is pooled across every client.

Why both exist: the Meta scopes this product needs (`pages_manage_posts`, `pages_read_engagement`, `pages_read_user_content`) are Advanced Access. An **unreviewed** Meta app can only act on Pages belonging to people who hold a role on the app itself — so a client using their own app needs no App Review, while Sevra's shared app requires App Review and Business Verification before it works for anyone else. Until that review passes, leave `PLATFORM_META_*` unset and the UI falls back to asking for the client's own credentials.

Changing the app for a network invalidates any account already connected through the old one — the stored tokens were issued to that app and cannot be refreshed or revoked by another. Saving or clearing credentials therefore flips that connection to `error` with a message telling the admin to reconnect, rather than letting it fail later mid-incident.

### Cron jobs

`20260722160000_cron_jobs.sql` and `20260915160000_heartbeat_cron.sql` schedule the jobs but reference a Vault secret by name. Automated provisioning creates it; for a deployment set up by hand, create it once:

```sql
select vault.create_secret('<service_role_key>', 'sevra_cron_service_role_key');
```

Without it every scheduled call goes out with an empty bearer and 401s silently — the original deployment accumulated roughly 946,000 such failures before anyone noticed, because a failing cron reports to nobody.

Those migrations also spell out a full function URL, and it is the *original* deployment's. Provisioning rewrites them to point at the new project; a deployment created by hand must be checked, or its jobs call someone else's project instead of their own.

---

## Support access

Sevra staff hold the `soporte` role on a client's deployment. Because the read policies on incidents, assets and mentions are `USING (true)`, that role can read the workspace — so it is made visible rather than implicit:

- Support accounts appear in the client's **Admin → Team & roles**
- Entering the workspace writes to `support_access_log`, shown to the client in **Audit Log**
- That table has a SELECT policy and deliberately no INSERT/UPDATE/DELETE policies: only a `SECURITY DEFINER` RPC writes, and no one can edit or erase an entry

**Limit:** this records entry *through the app*. Someone using API credentials directly could read without producing a row. Closing that fully needs `pgaudit` or routing reads through logging functions.

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Setup

```bash
npm install

# Create .env.local in the project root with your project's values:
#   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>

npm run dev
```

### Optional demo data

`supabase/seed.sql` contains an airline-flavored demo dataset (Aurora Skylines). It is **opt-in** and never runs as part of a migration — do not load it into a real client's database:

```bash
supabase db query --linked < supabase/seed.sql
```

### Checks

```bash
npx tsc --noEmit -p tsconfig.app.json
npx eslint src
npm run build
npm test          # vitest — infrastructure exists, but there is no real coverage yet
```

---

## Database Migrations

Applied in timestamp order. Key migrations:

| Migration | Purpose |
|---|---|
| `20260330` | Initial schema — incidents, social_mentions |
| `20260423` | Email infrastructure (pgmq, suppression lists) |
| `20260505` | Roles, `is_admin()`, company settings, team members, storage buckets |
| `20260518` | `crisis_level` column + audit trigger |
| `20260527` | RLS hardening (asset/audit/team policies) |
| `20260612` | Phase 1 hardening — `incident_type` CHECK, tags, `claim_first_admin()` |
| `20260701` | Table-level GRANT fix (authenticated / anon / service_role) |
| `20260722120000` | Social connections + tokens + OAuth state |
| `20260722130000` | Client-entered OAuth app credentials |
| `20260722140000` | `external_id` on mentions, for deduplicating real API pulls |
| `20260722150000` | Asset media columns + `asset-media` storage bucket |
| `20260722160000` | Social monitor and email queue cron jobs |
| `20260915120000` | Invite-only signup, role-granting on signup, admin claim locked to a designated email |
| `20260915130000` | `soporte` role (own migration — Postgres won't use a new enum value in the transaction that adds it) |
| `20260915140000` | Support access log + logging RPC |
| `20260915160000` | Deployment heartbeat cron |

> `20260701000000_grant_table_privileges` is required on any fresh project: PostgreSQL needs explicit `GRANT`s in addition to RLS policies.
>
> `20260509072107` is now an explanatory comment only. It originally wiped all incidents and seeded Aurora Skylines demo rows on every run, which would have dropped fake airline data into a real client's database on first setup.

---

## Edge Functions

| Function | Purpose |
|---|---|
| `sevra-analyze` | AI analysis of a social mention — classifies risk, creates/deduplicates incident |
| `generate-incident-assets` | Generates press releases, social posts, memos, Q&As via AI |
| `generate-asset-image` | Generates an image for an Instagram asset from a prompt |
| `social-monitor-cron` | Scheduled: pulls real X/Facebook mentions, simulates Instagram/TikTok, auto-analyzes |
| `social-monitor-control` | Enable/disable/status of the pg_cron monitor job |
| `social-oauth-start` | Begins an OAuth connection (admin only) |
| `social-oauth-callback` | Handles the provider redirect, exchanges tokens, resolves the Facebook Page |
| `social-oauth-credentials` | Stores/reads the client's own OAuth app credentials (admin only) |
| `social-oauth-disconnect` | Revokes and clears a connection (admin only) |
| `social-publish` | Publishes approved content to a connected X or Facebook account |
| `deployment-heartbeat` | Reports deployment metadata to the control plane |
| `agent-stripes` | Streaming AI assistant chat, grounded in workspace data |
| `process-email-queue` | Drains the pgmq email queue and sends |
| `send-transactional-email` | Enqueues a single transactional email |
| `preview-transactional-email` | Returns rendered HTML preview of an email template |
| `handle-email-unsubscribe` | Handles one-click unsubscribe tokens |
| `handle-email-suppression` | Manages email suppression list (bounces, spam complaints) |

---

## Known gaps

Recorded rather than glossed over:

- **Workflows** is a non-persisting prototype (see Features)
- **Email lists** and the **responsibility matrix** save to `localStorage`, so they are per-browser and do not sync between admins or devices
- **No real test coverage** — the tooling runs, but the only test asserts `true`
- **No rate limiting** on any edge function or the public lead form
- Instagram and TikTok **connect** but do not publish directly; both platforms require media on every post
