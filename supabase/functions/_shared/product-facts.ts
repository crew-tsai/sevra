// How Sevra works, for the assistant that has to explain it.
//
// Agent Stripes was told it could explain the platform, given no description of
// the platform, and forbidden from inventing — so asked "how do I escalate an
// incident to L3", it did the only honest thing left and asked the user to
// paste a runbook. The product even suggests that question as a starter chip.
//
// This is the missing half. Every statement here is behaviour that exists, and
// the limits are stated as plainly as the features: an assistant that promises
// TikTok monitoring is worse than one that says it is impossible.
//
// SOURCES OF TRUTH, when this needs updating:
//   - crisis levels: _shared/crisis-level.ts (the arithmetic, not prose)
//   - what the client is told: src/i18n/messages/help.ts (the Help page FAQ)
//   - automation: _shared/workflows.ts and the Workflows page
// If one of those changes and this does not, the assistant starts lying
// confidently, which is the failure this file exists to prevent.

export const PRODUCT_FACTS = `=== HOW SEVRA WORKS ===
Use this to answer questions about the product itself. It is authoritative:
prefer it over anything you assume about crisis tools in general. If a question
is not covered here, say so rather than guessing.

CRISIS LEVELS (L0 routine, L1 localized, L2 significant, L3 major, L4 catastrophic)
- The level is COMPUTED, never typed in. There is no button that sets an
  incident to L3.
- It starts from risk (critical=4, high=3, medium=2, low=1) and from the risk
  score (80+=4, 60+=3, 40+=2, 20+=1), whichever is higher.
- Then three rules apply, and they only ever raise it:
  * injury or fatality forces L4;
  * a regulator involved forces at least L3;
  * amplification — a verified or influential account, or one on the
    workspace's watchlist — adds one level to anything already above L0.
- So "how do I escalate to L3" has one honest answer: change the facts the
  level is computed from. An incident involving a regulator is already at
  least L3. Those facts are set when the incident is created and by the AI
  analysis of the mention that opened it; they are shown on the incident page
  but cannot currently be edited there.

APPROVALS — nothing publishes by itself
- Every communication needs two approvals: a team member sends it forward, then
  an administrator gives final approval. Only then can it be sent or published,
  and a person still presses the button.
- There is no automatic publishing anywhere in the product, by design. Never
  tell a user that Sevra will post something for them.

AUTOMATIC DRAFTING
- When an incident reaches the crisis level set in Workflows, Sevra drafts the
  whole package without being asked: press release, holding statement, posts
  per network, internal memo, Q&As.
- It follows the client's own crisis communications manual when one is uploaded
  in Admin › Company, and recognised practice for their industry when there is
  none. The audit log records which of the two was used.

WORKFLOWS — what the workspace does by itself
- Holds the baseline (the level at which a package is drafted) plus rules that
  match on risk, type, level, network or amplification.
- A rule can draft a package, notify, set status, or lock public response. It
  cannot publish. Only an administrator can change rules; everyone can read them.

MONITORING — what can and cannot be seen
- X: searched across the whole platform. This needs no connection and no
  credentials from the client — Sevra uses its own application token. The
  client only needs their handle in Admin › Company.
- Facebook and Instagram: comments, tags and mentions on the client's OWN
  accounts only. Neither platform can be searched for posts by other people.
- TikTok: cannot be monitored at all. It offers no way to search for mentions
  outside its academic research programme. An account can be connected so Sevra
  can act on it, never to listen.
- Watchlist (Admin › Company): accounts, hashtags and phrases to watch beyond
  the company's own name. On X these are searched; on Facebook and Instagram
  they mark what the client's own accounts already receive. A watched account
  can be set to raise the crisis level of what it posts.

WHERE THINGS ARE
Hub, SEVRA · Social Intel (mentions), Dashboard (incidents), Assets,
Approvals, Workflows, Reports, Audit Log, Admin, Help.

OTHER BEHAVIOUR WORTH KNOWING
- The audit log is append-only and names the person who made each change.
- Interface and AI content work in English and Spanish; content is stored in
  both and a communication keeps the language it was written in.
- Sevra staff hold a support role that is visible to the client in Admin ›
  Team & roles, and every support entry into the workspace is logged.
- Help (in the sidebar) writes to Sevra's own team, and the answer comes back
  under the question.
=== END HOW SEVRA WORKS ===`;
