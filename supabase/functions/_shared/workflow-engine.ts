// Carrying out the rules an administrator defined.
//
// Matching lives in ./workflows.ts, which the app shares so the builder and the
// engine can never disagree about what a rule means. This file is the half that
// only the server does: claiming a rule so it fires once, performing its
// actions, and recording what happened.
//
// Nothing here publishes anything. The actions are limited to work that stays
// inside the workspace — drafting, telling the team, moving a status, closing
// public publishing — because everything that leaves the workspace goes through
// the two approvals in Approvals.

import { matchingWorkflows, type Workflow, type WorkflowAction } from "./workflows.ts";

/** Nobody's inbox should receive a hundred copies because a list was pasted wrong. */
const MAX_RECIPIENTS_PER_RULE = 50;

export type EngineContext = {
  admin: any;
  supabaseUrl: string;
  serviceKey: string;
  /** The incident row, as stored. */
  incident: Record<string, any>;
  crisisLevel: number;
  lang: "en" | "es";
  companyName: string | null;
};

type ActionOutcome = { type: string; detail?: string; outcome: string };

async function auditRow(
  admin: any,
  incident: Record<string, any>,
  field: string,
  oldValue: string | null,
  newValue: string,
) {
  const { error } = await admin.from("incident_audit_log").insert({
    incident_id: incident.id,
    incident_title: incident.title,
    changed_by: null,
    field_name: field,
    old_value: oldValue,
    new_value: newValue,
    change_source: "sevra",
  });
  if (error) console.error("workflow engine: audit write failed —", error.message);
}

/** The addresses a "notify" action resolves to. `detail` is a list id or its name. */
async function listRecipients(admin: any, detail: string): Promise<{ name: string; emails: string[] }> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(detail.trim());
  const query = admin.from("email_lists").select("name, emails");
  const { data } = isUuid
    ? await query.eq("id", detail.trim()).maybeSingle()
    : await query.ilike("name", detail.trim()).maybeSingle();
  if (!data) return { name: detail, emails: [] };
  const emails = (data.emails ?? []).filter((e: string) => typeof e === "string" && e.includes("@"));
  return { name: data.name, emails: emails.slice(0, MAX_RECIPIENTS_PER_RULE) };
}

async function notify(ctx: EngineContext, workflow: Workflow, detail: string): Promise<string> {
  if (!detail.trim()) return "no list named on the rule";
  const { name, emails } = await listRecipients(ctx.admin, detail);
  if (!emails.length) return `list "${name}" has no addresses`;

  const incidentRef = `INC-${String(ctx.incident.id).slice(0, 8).toUpperCase()}`;
  let sent = 0;
  for (const to of emails) {
    // Through send-transactional-email rather than the provider directly, so a
    // rule's alert obeys the same suppression list, rate limits, retries and
    // send log as every other email this workspace sends.
    const res = await fetch(`${ctx.supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName: "crisis-alert",
        recipientEmail: to,
        // One alert per rule per incident per address, whatever retries happen.
        idempotencyKey: `wf-${workflow.id}-${ctx.incident.id}-${to}`,
        templateData: {
          incidentTitle: ctx.incident.title,
          incidentRef,
          crisisLevel: ctx.crisisLevel,
          risk: ctx.incident.risk,
          summary: ctx.incident.description ?? "",
          workflowName: workflow.name,
          companyName: ctx.companyName ?? undefined,
          lang: ctx.lang,
        },
      }),
    }).catch((e) => {
      console.error("workflow engine: alert send failed —", e);
      return null;
    });
    if (res?.ok) sent++;
  }
  return `notified ${sent}/${emails.length} on "${name}"`;
}

async function setStatus(ctx: EngineContext, next: string | null): Promise<string> {
  if (!next) return "no status on the rule";
  if (ctx.incident.status === next) return `already ${next}`;
  const { error } = await ctx.admin
    .from("incidents")
    .update({ status: next })
    .eq("id", ctx.incident.id);
  if (error) return `failed: ${error.message}`;
  await auditRow(ctx.admin, ctx.incident, "status", ctx.incident.status ?? null, next);
  ctx.incident.status = next;
  return `status → ${next}`;
}

async function lockPublic(ctx: EngineContext): Promise<string> {
  if (ctx.incident.is_public === false) return "already locked";
  const { error } = await ctx.admin
    .from("incidents")
    .update({ is_public: false })
    .eq("id", ctx.incident.id);
  if (error) return `failed: ${error.message}`;
  await auditRow(ctx.admin, ctx.incident, "is_public", "true", "false");
  ctx.incident.is_public = false;
  return "public publishing locked";
}

/**
 * Run every rule that applies to this incident.
 *
 * Returns whether any rule asked for the package, rather than drafting it here:
 * two rules can both ask, and the crisis gets one package, not two. The caller
 * makes that single request.
 */
export async function runWorkflows(
  ctx: EngineContext,
): Promise<{ fired: string[]; draftRequested: boolean }> {
  const { data: rows, error } = await ctx.admin
    .from("workflows")
    .select("id, name, enabled, incident_type, sub_type, min_crisis_level, criteria, actions, next_status")
    .eq("enabled", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("workflow engine: could not read the rules —", error.message);
    return { fired: [], draftRequested: false };
  }

  const workflows = (rows ?? []) as Workflow[];
  const matched = matchingWorkflows(workflows, ctx.incident, ctx.crisisLevel);
  const fired: string[] = [];
  let draftRequested = false;

  for (const workflow of matched) {
    // The claim. The unique index on (workflow_id, incident_id) is what makes a
    // rule fire once for a crisis that produces twenty posts.
    const { error: claimErr } = await ctx.admin
      .from("workflow_runs")
      .insert({ workflow_id: workflow.id, incident_id: ctx.incident.id });
    if (claimErr) continue; // Already fired for this incident.

    const outcomes: ActionOutcome[] = [];
    for (const action of (workflow.actions ?? []) as WorkflowAction[]) {
      switch (action.type) {
        case "draft_package":
          draftRequested = true;
          outcomes.push({ type: action.type, outcome: "package requested" });
          break;
        case "notify":
          outcomes.push({
            type: action.type,
            detail: action.detail,
            outcome: await notify(ctx, workflow, action.detail ?? ""),
          });
          break;
        case "set_status":
          outcomes.push({ type: action.type, outcome: await setStatus(ctx, workflow.next_status) });
          break;
        case "lock_public":
          outcomes.push({ type: action.type, outcome: await lockPublic(ctx) });
          break;
        case "log_only":
          outcomes.push({ type: action.type, outcome: "recorded" });
          break;
        default:
          // A rule saved by an older build, or an action this engine does not
          // perform. Recorded rather than silently dropped.
          outcomes.push({ type: String(action.type), outcome: "not carried out" });
      }
    }

    await ctx.admin
      .from("workflow_runs")
      .update({ result: { workflow: workflow.name, actions: outcomes } })
      .eq("workflow_id", workflow.id)
      .eq("incident_id", ctx.incident.id);

    await auditRow(ctx.admin, ctx.incident, "workflow", null, workflow.name);
    fired.push(workflow.name);
  }

  return { fired, draftRequested };
}
