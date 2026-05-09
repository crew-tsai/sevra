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

// Mock data themed around Aurora Skylines — Madrid-based hybrid network carrier.
export const incidents: Incident[] = [
  {
    id: "INC-001",
    title: "Aurora Skylines AS412 MAD–BOG — severe turbulence with injuries",
    description: "Flight AS412 (MAD–BOG, A350-900) encountered severe clear-air turbulence over the Atlantic. Three passengers and one cabin crew member sustained injuries; aircraft diverted to Lisbon (LIS) for medical evacuation. OCC and CCC fully activated.",
    risk: "critical",
    status: "active",
    category: "Safety — Turbulence Event",
    createdAt: "2026-03-29T14:23:00Z",
    updatedAt: "2026-03-30T08:15:00Z",
    assignee: "Elena Navarro",
    riskScore: 92,
  },
  {
    id: "INC-002",
    title: "Cancellation wave at MAD T4 — crew shortage",
    description: "12 short-haul rotations cancelled out of Madrid–Barajas T4 due to overnight crew sickness cluster. ~1,800 passengers impacted across MAD-BCN, MAD-LIS and MAD-CDG. Rebooking and hotel coordination underway with ground handling.",
    risk: "high",
    status: "monitoring",
    category: "Delay — Cancellation Wave",
    createdAt: "2026-03-28T09:00:00Z",
    updatedAt: "2026-03-30T06:00:00Z",
    assignee: "Marcos Ruiz",
    riskScore: 74,
  },
  {
    id: "INC-003",
    title: "Viral video alleging discrimination on AS220 LIS–GRU boarding",
    description: "TikTok clip (>1.2M views) claims a passenger was denied boarding for language reasons on flight AS220 Lisbon–São Paulo. Sentiment trending negative across ES/PT markets. Service Recovery and Corporate Affairs reviewing CCTV and gate logs.",
    risk: "medium",
    status: "active",
    category: "Customer Treatment — Discrimination Claim",
    createdAt: "2026-03-30T02:00:00Z",
    updatedAt: "2026-03-30T07:30:00Z",
    assignee: "Inés Carvalho",
    riskScore: 58,
  },
  {
    id: "INC-004",
    title: "Check-in & boarding system outage — Barajas T4",
    description: "DCS partial outage at MAD T4 from 05:40–07:10 local. Manual boarding activated for 9 departures. No safety impact; minor delays cascaded across the morning bank. Vendor RCA in progress.",
    risk: "medium",
    status: "contained",
    category: "Outage — Check-in Failure",
    createdAt: "2026-03-27T16:00:00Z",
    updatedAt: "2026-03-29T20:00:00Z",
    assignee: "Diego Almeida",
    riskScore: 45,
  },
  {
    id: "INC-005",
    title: "Minor baggage delay — AS118 BCN–MAD",
    description: "Baggage delivery delayed ~90 minutes on inbound AS118 due to a belt loader fault at BCN. 14 PIRs filed; all bags reunited within 24h. No reputational exposure detected.",
    risk: "low",
    status: "resolved",
    category: "Delay — Baggage",
    createdAt: "2026-03-25T11:00:00Z",
    updatedAt: "2026-03-26T15:00:00Z",
    assignee: "Sofía Beltrán",
    riskScore: 18,
  },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "1", timestamp: "2026-03-29T14:23:00Z", title: "Turbulence event detected", description: "ACARS alert from AS412 over the North Atlantic — sudden vertical acceleration. OCC notified.", type: "alert" },
  { id: "2", timestamp: "2026-03-29T14:45:00Z", title: "CCC partial activation", description: "Duty Communications Officer activated. Holding statement drafted. Spokesperson on standby.", type: "action" },
  { id: "3", timestamp: "2026-03-29T16:00:00Z", title: "Diversion to Lisbon (LIS)", description: "Captain elected to divert to LIS. 3 PAX + 1 cabin crew with injuries; medical teams pre-positioned.", type: "update" },
  { id: "4", timestamp: "2026-03-29T18:30:00Z", title: "Family support line opened", description: "Aurora Care Team activated. Dedicated multilingual line published; PR Agency HQ on call.", type: "action" },
  { id: "5", timestamp: "2026-03-30T08:15:00Z", title: "Investigation handoff", description: "Aircraft inspected and released. Safety report shared with CIAIAC and EASA. Updates continue every 4h.", type: "update" },
];

export const statements: Statement[] = [
  {
    id: "STM-001",
    title: "Passenger notification — AS412 MAD–BOG diversion",
    content: "Aurora Skylines is reaching out personally to every passenger and family member affected by the diversion of flight AS412 from Madrid to Bogotá. Our Care Team is providing accommodation, transport and medical follow-up where needed. The safety of those we fly is our highest priority...",
    type: "stakeholder",
    status: "pending",
    createdAt: "2026-03-30T09:00:00Z",
  },
  {
    id: "STM-002",
    title: "Press release — AS412 turbulence event",
    content: "Aurora Skylines confirms that flight AS412, operating from Madrid–Barajas to Bogotá, encountered severe turbulence over the Atlantic and diverted to Lisbon as a precaution. Three passengers and one cabin crew member received medical attention on arrival. We are in close contact with the relevant authorities...",
    type: "press",
    status: "pending",
    createdAt: "2026-03-30T09:30:00Z",
  },
  {
    id: "STM-003",
    title: "Internal memo — CCC activation, AS412",
    content: "Team — As of 14:45 CET we have activated the Crisis Communications Center at Level 3 for flight AS412. Here is what each division needs to know about coordination with OCC, Customer Experience and Corporate Affairs...",
    type: "internal",
    status: "approved",
    createdAt: "2026-03-30T07:00:00Z",
  },
  {
    id: "STM-004",
    title: "Holding statement — social channels",
    content: "We are aware of the situation involving Aurora Skylines flight AS412 and are working closely with local authorities in Lisbon. The wellbeing of our passengers and crew is our highest priority. We will share verified updates as soon as they are available.",
    type: "social",
    status: "approved",
    createdAt: "2026-03-30T08:00:00Z",
  },
];
