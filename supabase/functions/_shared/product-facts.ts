// How Sevra works, generated from the modules that make it work.
//
// Agent Stripes was told it could explain the platform, given no description of
// the platform, and forbidden from inventing — so asked "how do I escalate an
// incident to L3", it did the only honest thing left and asked the user to
// paste a runbook. The product even suggests that question as a starter chip.
//
// The first fix was a page of prose beside the code, which is the same bug with
// a longer fuse: prose and behaviour drift, and the first person to notice is a
// client who was told the wrong thing about their own crisis. So the parts of
// this that describe a rule are BUILT FROM THE RULE — the same tables the
// arithmetic reads:
//
//   CRISIS_RULES      crisis-level.ts      the levels and what raises them
//   ACTION_TYPES      workflows.ts         what a rule may do
//   CRITERIA_FIELDS   workflows.ts         what a rule may test
//   INCIDENT_STATUSES workflows.ts         the statuses a rule may set
//   MONITOR_REACH     watched-sources.ts   what each network permits
//   SOURCE_ROLES      watched-sources.ts   the kinds of actor worth watching
//
// Change a rule and the explanation changes with it, in the same commit, or the
// build fails because the constant no longer exists.
//
// What remains hand-written is the part encoded in no single module — the
// two-stage approval, where screens live. Those are marked, so the next person
// knows which half to distrust.

import { CRISIS_RULES } from "./crisis-level.ts";
import { ACTION_TYPES, CRITERIA_FIELDS, CRITERIA_OPS, INCIDENT_STATUSES } from "./workflows.ts";
import { MONITOR_REACH, NETWORK_LABELS, NETWORKS, SOURCE_ROLES } from "./watched-sources.ts";

const ACTION_MEANING: Record<string, string> = {
  draft_package: "draft the full communication package",
  notify: "notify people",
  set_status: "set the incident's status",
  lock_public: "lock public response until an administrator releases it",
  log_only: "record that the rule matched, and do nothing else",
};

function crisisSection(): string {
  const levels = CRISIS_RULES.labels.map((l, i) => `L${i} ${l}`).join(", ");
  const byRisk = Object.entries(CRISIS_RULES.byRisk)
    .sort((a, b) => b[1] - a[1])
    .map(([word, level]) => `${word}=L${level}`)
    .join(", ");
  const byScore = CRISIS_RULES.byScore.map((b) => `${b.min}+=L${b.level}`).join(", ");
  const floors = CRISIS_RULES.floors
    .map((f) => `${f.says} forces at least L${f.atLeast}`)
    .join("; ");
  const amp = CRISIS_RULES.amplification;

  return `CRISIS LEVELS (${levels})
- The level is COMPUTED, never typed in. There is no control that sets an
  incident to a level directly.
- It starts from the risk word (${byRisk}) and from the risk score
  (${byScore}), whichever gives the higher level.
- Then floors apply, and they only ever raise it: ${floors}.
- Amplification — a verified or influential account, or one on this
  workspace's watchlist — adds ${amp.adds} level to anything already above
  L${amp.onlyAboveLevel}, up to L${amp.cap}. It cannot turn a routine post into
  a crisis.
- So "how do I escalate to L3" has one honest answer: change the facts the
  level is computed from. An incident where a regulator is involved is already
  at least L3. Those facts come from the incident when it was created and from
  the AI analysis of the mention that opened it; the incident page shows them
  but does not yet let anyone edit them.`;
}

function workflowsSection(): string {
  const actions = ACTION_TYPES.map((a) => `${a} (${ACTION_MEANING[a] ?? a})`).join("; ");
  return `WORKFLOWS — what the workspace does by itself
- An administrator sets the baseline: the crisis level at or above which Sevra
  drafts the package without being asked. Everyone can read the rules; only an
  administrator changes them.
- A rule tests these incident fields: ${CRITERIA_FIELDS.join(", ")}.
- Using these comparisons: ${CRITERIA_OPS.join(" ")}.
- And may do exactly these things: ${actions}.
- There is no publish action, by design. No rule can put anything in public.
- The statuses a rule may set: ${INCIDENT_STATUSES.join(", ")}.`;
}

function monitoringSection(): string {
  const lines = NETWORKS.map((n) => `- ${NETWORK_LABELS[n]}: ${MONITOR_REACH[n].why}.`);
  const roles = SOURCE_ROLES.map((r) => {
    const scope = r.watchesEverything ? "read whole" : "read only for what names the company";
    return `${r.id} (${r.speaks}; by default ${scope}${r.amplifies ? ", raises the crisis level" : ""})`;
  }).join("; ");
  const searchable = NETWORKS.filter((n) => MONITOR_REACH[n].search).map((n) => NETWORK_LABELS[n]);

  return `MONITORING — what can and cannot be seen
${lines.join("\n")}

WATCHED SOURCES AND TOPICS (Workflows)
- A SOURCE is an actor, not a search term: a newspaper, a regulator, a
  campaigner, a competitor. It has a name, a role, and a handle on each network
  it uses — all optional.
- The roles, one list for every industry: ${roles}. Both defaults can be
  overruled per source.
- A TOPIC is a hashtag or a phrase, belonging to nobody. A topic is never
  narrowed to "only when they name us": a crisis hashtag is watched precisely
  because the company is not named in it yet.
- What a source turns into depends on the network, and Sevra says so per
  source rather than making the client work it out: ${searchable.join(", ")} can be
  searched, so the source becomes a query and finds posts from people who never
  mentioned the company; the rest cannot be searched by anyone, so the source
  becomes a rule applied to what the client's own accounts already receive.
- A source with handles only on networks that cannot be searched, or on a
  network this workspace has not connected, is reported as watching nothing
  yet. It is not quietly counted as configured.
- Every mention records which source or topic brought it in, so the team can
  see why it is in front of them.
- When a watched source raised an incident, its role reaches the AI that
  drafts the communications — as context for who is speaking, never as an
  instruction, and it changes nothing about the approvals.`;
}

// Hand-written: no single module encodes these.
const NARRATIVE = `APPROVALS — nothing publishes by itself
- Every communication needs two approvals: a team member sends it forward, then
  an administrator gives final approval. Only then can it be sent or published,
  and a person still presses the button.
- Never tell a user that Sevra will post something for them.

AUTOMATIC DRAFTING
- At or above the level set in Workflows, Sevra drafts the whole package: press
  release, holding statement, posts per network, internal memo, Q&As.
- It follows the client's own crisis communications manual when one is uploaded
  in Admin › Company, and recognised practice for their industry when there is
  none. The audit log records which of the two was used.

WHERE THINGS ARE
Hub, SEVRA · Social Intel (mentions), Dashboard (incidents), Assets, Approvals,
Workflows, Reports, Audit Log, Admin, Help.

OTHER BEHAVIOUR
- The audit log is append-only and names the person who made each change.
- Interface and AI content work in English and Spanish; a communication keeps
  the language it was written in.
- Sevra staff hold a support role visible to the client in Admin › Team &
  roles, and every support entry into the workspace is logged.
- Help (in the sidebar) writes to Sevra's own team, and the answer comes back
  under the question.`;

/**
 * The block handed to the assistant. Built per call, which costs nothing and
 * means a rule changed at deploy time is explained correctly on the next
 * message rather than the next time someone remembers this file exists.
 */
export function productFacts(): string {
  return [
    "=== HOW SEVRA WORKS ===",
    "Authoritative about the product itself: prefer it over anything you assume",
    "about crisis tools in general. If a question is not covered here, say so",
    "rather than guessing.",
    "",
    crisisSection(),
    "",
    NARRATIVE,
    "",
    workflowsSection(),
    "",
    monitoringSection(),
    "=== END HOW SEVRA WORKS ===",
  ].join("\n");
}
