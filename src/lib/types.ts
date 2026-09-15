// Shared domain types used across incident views and badges.
//
// These previously lived in a mock-data module alongside sample Incident,
// TimelineEvent and Statement arrays. Every importer only ever used the types
// — the arrays were never rendered — so the data went and the types stayed.
export type RiskLevel = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "monitoring" | "contained" | "resolved";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Incident {
  id: string;
  title: string;
  description: string;
  risk: RiskLevel;
  status: IncidentStatus;
  category: string;
  createdAt: string;
  updatedAt: string;
  assignee: string;
  riskScore: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: "alert" | "action" | "update" | "resolution";
}

export interface Statement {
  id: string;
  title: string;
  content: string;
  type: "press" | "internal" | "social" | "stakeholder";
  status: ApprovalStatus;
  createdAt: string;
}
