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

export const incidents: Incident[] = [
  {
    id: "INC-001",
    title: "Data breach detected in EU customer database",
    description: "Unauthorized access detected in the EU-West-1 customer database cluster. Preliminary analysis indicates potential exposure of customer PII including email addresses and hashed passwords. The breach appears to have originated from a compromised service account.",
    risk: "critical",
    status: "active",
    category: "Data Breach",
    createdAt: "2026-03-29T14:23:00Z",
    updatedAt: "2026-03-30T08:15:00Z",
    assignee: "Sarah Chen",
    riskScore: 92,
  },
  {
    id: "INC-002",
    title: "Supply chain disruption — key vendor insolvency",
    description: "Critical vendor TechParts Inc. has filed for Chapter 11 bankruptcy. This affects our Q2 hardware delivery pipeline for 3 product lines.",
    risk: "high",
    status: "monitoring",
    category: "Supply Chain",
    createdAt: "2026-03-28T09:00:00Z",
    updatedAt: "2026-03-30T06:00:00Z",
    assignee: "James Wright",
    riskScore: 74,
  },
  {
    id: "INC-003",
    title: "Negative press coverage — product safety concerns",
    description: "Major news outlet published investigation into product safety claims. Social media sentiment trending negative.",
    risk: "medium",
    status: "active",
    category: "Reputation",
    createdAt: "2026-03-30T02:00:00Z",
    updatedAt: "2026-03-30T07:30:00Z",
    assignee: "Maria Lopez",
    riskScore: 58,
  },
  {
    id: "INC-004",
    title: "Regional office evacuation — severe weather",
    description: "Houston office evacuated due to Category 3 hurricane warning. 120 employees affected, business continuity plan activated.",
    risk: "medium",
    status: "contained",
    category: "Natural Disaster",
    createdAt: "2026-03-27T16:00:00Z",
    updatedAt: "2026-03-29T20:00:00Z",
    assignee: "David Kim",
    riskScore: 45,
  },
  {
    id: "INC-005",
    title: "Minor phishing attempt — internal training gap",
    description: "Phishing emails detected targeting finance department. No credentials compromised. Identified gap in quarterly security training.",
    risk: "low",
    status: "resolved",
    category: "Cybersecurity",
    createdAt: "2026-03-25T11:00:00Z",
    updatedAt: "2026-03-26T15:00:00Z",
    assignee: "Alex Turner",
    riskScore: 18,
  },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "1", timestamp: "2026-03-29T14:23:00Z", title: "Anomaly detected", description: "Automated monitoring flagged unusual query patterns on EU-West-1 cluster.", type: "alert" },
  { id: "2", timestamp: "2026-03-29T14:45:00Z", title: "Security team notified", description: "Incident response team assembled. Initial triage begun.", type: "action" },
  { id: "3", timestamp: "2026-03-29T16:00:00Z", title: "Scope assessment", description: "Confirmed unauthorized access via compromised service account. Estimated 12,000 records potentially exposed.", type: "update" },
  { id: "4", timestamp: "2026-03-29T18:30:00Z", title: "Access revoked", description: "Compromised credentials rotated. Network segmentation applied.", type: "action" },
  { id: "5", timestamp: "2026-03-30T08:15:00Z", title: "Forensic analysis ongoing", description: "Third-party forensics team engaged. Full audit in progress.", type: "update" },
];

export const statements: Statement[] = [
  {
    id: "STM-001",
    title: "Customer notification — data incident",
    content: "We are writing to inform you of a security incident that may have affected your personal information. Upon detection, we immediately engaged our incident response protocols...",
    type: "stakeholder",
    status: "pending",
    createdAt: "2026-03-30T09:00:00Z",
  },
  {
    id: "STM-002",
    title: "Press release — security update",
    content: "Today we are disclosing a security incident involving unauthorized access to a subset of customer data. We take data security extremely seriously...",
    type: "press",
    status: "pending",
    createdAt: "2026-03-30T09:30:00Z",
  },
  {
    id: "STM-003",
    title: "Internal memo — incident response update",
    content: "Team, as you may be aware, we are currently responding to a security incident. Here is what you need to know and what we need from each department...",
    type: "internal",
    status: "approved",
    createdAt: "2026-03-30T07:00:00Z",
  },
  {
    id: "STM-004",
    title: "Social media holding statement",
    content: "We're aware of reports regarding a security incident. We're actively investigating and will share updates as they become available. Customer security is our top priority.",
    type: "social",
    status: "approved",
    createdAt: "2026-03-30T08:00:00Z",
  },
];
