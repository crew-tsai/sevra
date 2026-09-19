// Mirrors src/lib/industries.ts — kept as a separate copy rather than a shared
// import because edge functions (Deno) and the frontend (Vite) build with
// different toolchains. Keep the two in sync when adding an industry.

export const INCIDENT_TYPES = [
  "safety",
  "delay",
  "customer_treatment",
  "outage",
  "misinformation",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export type IndustryProfile = {
  group: string;
  operatorLabel: string;
  /** A made-up name, so the placeholder never suggests a real company. */
  operatorExample: string;
  serviceLabel: string;
  locationLabel: string;
  peopleLabel: string;
  /** What the incident's "route" field means here: a route for transport, a phase for construction. */
  routeLabel: string;
  serviceExample: string;
  routeExample: string;
  locationExample: string;
  /** Short phrase naming the service, for AI-generated sample posts. */
  simFlavor: string;
  /** Only where the default word would mislead for this industry. */
  typeLabels?: Partial<Record<IncidentType, string>>;
  subTypes: Record<IncidentType, string[]>;
};

/** Default labels for the five incident types. */
export const DEFAULT_TYPE_LABELS: Record<IncidentType, string> = {
  safety: "Safety",
  delay: "Delay",
  customer_treatment: "Customer treatment",
  outage: "Outage",
  misinformation: "Misinformation",
};

// Cross-cutting sub-types. Every industry gets these and adds its own.
const COMMON_TREATMENT = [
  "discrimination_claim",
  "staff_behavior_issue",
  "accessibility_issue",
  "service_complaint",
  "privacy_complaint",
];

const COMMON_MISINFORMATION = [
  "false_rumor",
  "misleading_video",
  "fake_news",
  "manipulated_content",
  "social_media_backlash",
];

const GENERIC: IndustryProfile = {
  group: "Other",
  operatorLabel: "Operator",
  operatorExample: "e.g. Acme Services",
  serviceLabel: "Service ID",
  locationLabel: "Location code",
  peopleLabel: "People impacted",
  routeLabel: "Area / segment",
  serviceExample: "e.g. SVC-4021",
  routeExample: "e.g. North region",
  locationExample: "e.g. HUB1",
  simFlavor: "service",
  subTypes: {
    safety: ["injury_report", "safety_event", "medical_emergency", "technical_failure"],
    delay: ["service_delay", "cancellation_wave", "staff_shortage", "capacity_shortfall"],
    customer_treatment: COMMON_TREATMENT,
    outage: ["system_outage", "app_or_website_down", "payment_system_failure", "network_outage"],
    misinformation: COMMON_MISINFORMATION,
  },
};

/** Shared shape for passenger-carrying transport modes. */
function transportProfile(
  operatorLabel: string,
  serviceLabel: string,
  locationLabel: string,
  peopleLabel: string,
  examples: { operator: string; service: string; route: string; location: string },
  simFlavor: string,
  extra: Partial<Record<IncidentType, string[]>> = {},
): IndustryProfile {
  return {
    group: "Transportation",
    operatorLabel,
    operatorExample: examples.operator,
    serviceLabel,
    locationLabel,
    peopleLabel,
    routeLabel: "Route",
    serviceExample: examples.service,
    routeExample: examples.route,
    locationExample: examples.location,
    simFlavor,
    subTypes: {
      safety: extra.safety ?? [
        "injury_report",
        "safety_event",
        "medical_emergency",
        "onboard_incident",
        "technical_failure",
        "emergency_stop",
      ],
      delay: extra.delay ?? [
        "cancellation_wave",
        "service_delay",
        "missed_connections",
        "staff_shortage",
        "hub_disruption",
      ],
      customer_treatment: [...COMMON_TREATMENT, "passenger_removal"],
      outage: extra.outage ?? [
        "system_outage",
        "checkin_failure",
        "boarding_system_issue",
        "baggage_system_failure",
        "app_or_website_down",
      ],
      misinformation: COMMON_MISINFORMATION,
    },
  };
}

export const INDUSTRIES: Record<string, IndustryProfile> = {
  // ── Transportation ────────────────────────────────────────────────
  Airline: transportProfile("Airline", "Flight number", "Airport code", "Passengers impacted", {
    operator: "e.g. Aurora Airways",
    service: "e.g. AS412",
    route: "e.g. MAD-BCN",
    location: "e.g. MAD",
  }, "airline flight"),
  Rail: transportProfile("Rail operator", "Train number", "Station code", "Passengers impacted", {
    operator: "e.g. Northline Rail",
    service: "e.g. IC2047",
    route: "e.g. Madrid-Barcelona",
    location: "e.g. MADR",
  }, "train service", {
    safety: ["injury_report", "derailment", "level_crossing_incident", "medical_emergency", "technical_failure", "emergency_stop"],
    outage: ["system_outage", "ticketing_failure", "signalling_failure", "app_or_website_down"],
  }),
  "Bus/Coach": transportProfile("Bus company", "Route number", "Stop/terminal code", "Passengers impacted", {
    operator: "e.g. Metro Coachlines",
    service: "e.g. R12",
    route: "e.g. Downtown-Airport",
    location: "e.g. T4",
  }, "bus route", {
    safety: ["injury_report", "road_collision", "medical_emergency", "onboard_incident", "technical_failure"],
    outage: ["system_outage", "ticketing_failure", "app_or_website_down"],
  }),
  "Maritime/Ferry": transportProfile("Shipping line", "Voyage number", "Port code", "Passengers impacted", {
    operator: "e.g. Blue Bay Ferries",
    service: "e.g. V-3305",
    route: "e.g. Barcelona-Palma",
    location: "e.g. BCN",
  }, "ferry crossing", {
    safety: ["injury_report", "man_overboard", "grounding_or_collision", "medical_emergency", "technical_failure", "emergency_stop"],
    outage: ["system_outage", "boarding_system_issue", "app_or_website_down"],
  }),
  "Ride-hailing": transportProfile("Ride-hailing company", "Trip ID", "Zone/city code", "Riders impacted", {
    operator: "e.g. RideNow",
    service: "e.g. TRIP-88291",
    route: "e.g. Downtown-Airport",
    location: "e.g. ZONE-3",
  }, "ride", {
    safety: ["injury_report", "road_collision", "driver_conduct", "passenger_assault", "vehicle_failure"],
    delay: ["surge_disruption", "service_delay", "driver_shortage", "zone_outage"],
    outage: ["system_outage", "dispatch_failure", "payment_system_failure", "app_or_website_down"],
  }),
  "Public Transit": transportProfile("Transit operator", "Line/route number", "Station/stop code", "Riders impacted", {
    operator: "e.g. City Transit Authority",
    service: "e.g. Line 4",
    route: "e.g. North-South Line",
    location: "e.g. STN-12",
  }, "transit line", {
    outage: ["system_outage", "ticketing_failure", "signalling_failure", "app_or_website_down"],
  }),
  "Freight/Logistics": {
    group: "Transportation",
    operatorLabel: "Carrier",
    operatorExample: "e.g. Swift Cargo",
    serviceLabel: "Shipment/tracking number",
    locationLabel: "Depot/hub code",
    peopleLabel: "Shipments/customers impacted",
    routeLabel: "Route",
    serviceExample: "e.g. SHP-77213",
    routeExample: "e.g. Warehouse A-Warehouse B",
    locationExample: "e.g. HUB-A",
    simFlavor: "freight shipment",
    typeLabels: { delay: "Delivery delay" },
    subTypes: {
      safety: ["injury_report", "road_collision", "hazmat_incident", "warehouse_accident", "technical_failure"],
      delay: ["delivery_delay", "customs_hold", "capacity_shortfall", "staff_shortage", "hub_disruption"],
      customer_treatment: [...COMMON_TREATMENT, "lost_or_damaged_goods"],
      outage: ["system_outage", "tracking_system_failure", "sorting_system_failure", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },

  // ── Health ────────────────────────────────────────────────────────
  Healthcare: {
    group: "Health",
    operatorLabel: "Provider",
    operatorExample: "e.g. Riverside General Hospital",
    serviceLabel: "Case/encounter ID",
    locationLabel: "Facility/unit",
    peopleLabel: "Patients affected",
    routeLabel: "Department / care pathway",
    serviceExample: "e.g. ENC-48210",
    routeExample: "e.g. Emergency-ICU",
    locationExample: "e.g. WARD-3",
    simFlavor: "hospital visit",
    typeLabels: { delay: "Care delay", customer_treatment: "Patient treatment" },
    subTypes: {
      safety: ["patient_harm", "medication_error", "infection_outbreak", "surgical_complication", "equipment_failure"],
      delay: ["appointment_backlog", "ambulance_diversion", "capacity_overflow", "staff_shortage", "elective_postponement"],
      customer_treatment: [...COMMON_TREATMENT, "consent_dispute", "billing_dispute"],
      outage: ["ehr_outage", "lab_system_failure", "imaging_system_failure", "scheduling_system_down", "network_outage"],
      misinformation: [...COMMON_MISINFORMATION, "health_misinformation"],
    },
  },

  // ── Finance ───────────────────────────────────────────────────────
  "Financial Services": {
    group: "Finance",
    operatorLabel: "Institution",
    operatorExample: "e.g. Northbank",
    serviceLabel: "Transaction/account ref",
    locationLabel: "Branch/region code",
    peopleLabel: "Customers affected",
    routeLabel: "Business line",
    serviceExample: "e.g. TXN-99183",
    routeExample: "e.g. Retail-Corporate",
    locationExample: "e.g. BR-114",
    simFlavor: "banking service",
    typeLabels: { safety: "Security & fraud", delay: "Service delay" },
    subTypes: {
      safety: ["fraud_incident", "data_breach", "sanctions_breach", "physical_security_event", "insider_misconduct"],
      delay: ["payment_delay", "settlement_failure", "processing_backlog", "branch_closure", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "mis_selling_claim", "account_closure_dispute"],
      outage: ["core_banking_outage", "payments_outage", "atm_network_down", "trading_platform_down", "app_or_website_down"],
      misinformation: [...COMMON_MISINFORMATION, "market_rumor"],
    },
  },
  Insurance: {
    group: "Finance",
    operatorLabel: "Insurer",
    operatorExample: "e.g. Shield Mutual",
    serviceLabel: "Policy/claim number",
    locationLabel: "Region code",
    peopleLabel: "Policyholders affected",
    routeLabel: "Product line",
    serviceExample: "e.g. CLM-33019",
    routeExample: "e.g. Auto-Home",
    locationExample: "e.g. REG-2",
    simFlavor: "insurance claim",
    typeLabels: { delay: "Claims delay" },
    subTypes: {
      safety: ["fraud_incident", "data_breach", "insider_misconduct", "regulatory_breach"],
      delay: ["claims_backlog", "payout_delay", "assessment_delay", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "claim_denial_dispute", "mis_selling_claim"],
      outage: ["policy_system_outage", "claims_portal_down", "payment_system_failure", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },

  // ── Consumer ──────────────────────────────────────────────────────
  "Hospitality & Travel": {
    group: "Consumer",
    operatorLabel: "Operator",
    operatorExample: "e.g. Harbor View Hotels",
    serviceLabel: "Booking reference",
    locationLabel: "Property/site code",
    peopleLabel: "Guests affected",
    routeLabel: "Area / service",
    serviceExample: "e.g. BK-77412",
    routeExample: "e.g. Resort-Spa",
    locationExample: "e.g. PROP-9",
    simFlavor: "hotel stay",
    subTypes: {
      safety: ["injury_report", "fire_or_evacuation", "foodborne_illness", "medical_emergency", "security_incident"],
      delay: ["overbooking", "check_in_delay", "closure_or_refurbishment", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "booking_dispute", "refund_dispute"],
      outage: ["booking_system_outage", "key_system_failure", "payment_system_failure", "app_or_website_down"],
      misinformation: [...COMMON_MISINFORMATION, "fake_reviews"],
    },
  },
  "Retail & E-commerce": {
    group: "Consumer",
    operatorLabel: "Retailer",
    operatorExample: "e.g. Urban Market",
    serviceLabel: "Order number",
    locationLabel: "Store/warehouse code",
    peopleLabel: "Customers affected",
    routeLabel: "Sales channel",
    serviceExample: "e.g. ORD-51220",
    routeExample: "e.g. Online-Store",
    locationExample: "e.g. ST-42",
    simFlavor: "online order",
    typeLabels: { delay: "Fulfilment delay", safety: "Product & safety" },
    subTypes: {
      safety: ["product_recall", "product_safety_defect", "injury_report", "store_security_incident"],
      delay: ["fulfilment_delay", "stockout", "delivery_delay", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "refund_dispute", "warranty_dispute"],
      outage: ["checkout_outage", "payment_system_failure", "inventory_system_failure", "app_or_website_down"],
      misinformation: [...COMMON_MISINFORMATION, "fake_reviews", "counterfeit_claims"],
    },
  },
  "Food & Beverage": {
    group: "Consumer",
    operatorLabel: "Operator",
    operatorExample: "e.g. Green Leaf Foods",
    serviceLabel: "Batch/order number",
    locationLabel: "Site/venue code",
    peopleLabel: "Customers affected",
    routeLabel: "Supply chain stage",
    serviceExample: "e.g. BATCH-2291",
    routeExample: "e.g. Production-Retail",
    locationExample: "e.g. SITE-7",
    simFlavor: "restaurant visit",
    typeLabels: { safety: "Food safety" },
    subTypes: {
      safety: ["foodborne_illness", "product_recall", "contamination", "allergen_mislabeling", "injury_report"],
      delay: ["supply_shortage", "delivery_delay", "closure", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "refund_dispute"],
      outage: ["pos_outage", "ordering_system_down", "payment_system_failure", "app_or_website_down"],
      misinformation: [...COMMON_MISINFORMATION, "fake_reviews", "ingredient_rumor"],
    },
  },

  // ── Infrastructure ────────────────────────────────────────────────
  "Energy & Utilities": {
    group: "Infrastructure",
    operatorLabel: "Utility",
    operatorExample: "e.g. Brightgrid Energy",
    serviceLabel: "Incident/work order ref",
    locationLabel: "Grid/zone code",
    peopleLabel: "Customers affected",
    routeLabel: "Network segment",
    serviceExample: "e.g. WO-40218",
    routeExample: "e.g. Substation A-B",
    locationExample: "e.g. ZONE-11",
    simFlavor: "utility service",
    typeLabels: { outage: "Supply outage" },
    subTypes: {
      safety: ["injury_report", "gas_leak", "fire_or_explosion", "environmental_spill", "equipment_failure"],
      delay: ["restoration_delay", "planned_works_overrun", "connection_backlog", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "billing_dispute", "disconnection_dispute"],
      outage: ["power_outage", "water_supply_failure", "gas_supply_failure", "metering_system_down", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },
  Telecommunications: {
    group: "Infrastructure",
    operatorLabel: "Operator",
    operatorExample: "e.g. Nexa Telecom",
    serviceLabel: "Incident/ticket ref",
    locationLabel: "Cell/region code",
    peopleLabel: "Subscribers affected",
    routeLabel: "Network segment",
    serviceExample: "e.g. INC-77120",
    routeExample: "e.g. Core-Edge",
    locationExample: "e.g. CELL-88",
    simFlavor: "mobile service",
    typeLabels: { outage: "Network outage" },
    subTypes: {
      safety: ["injury_report", "data_breach", "mast_or_site_incident", "equipment_failure"],
      delay: ["installation_backlog", "restoration_delay", "provisioning_delay", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "billing_dispute", "contract_dispute"],
      outage: ["network_outage", "mobile_service_down", "broadband_outage", "emergency_calls_affected", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },

  // ── Construction ──────────────────────────────────────────────────
  Construction: {
    group: "Construction",
    operatorLabel: "Contractor",
    operatorExample: "e.g. Solid Build Contractors",
    serviceLabel: "Project/contract number",
    locationLabel: "Site code",
    peopleLabel: "People affected",
    routeLabel: "Work package / phase",
    serviceExample: "e.g. PRJ-2291",
    routeExample: "e.g. Phase 2 - Foundations",
    locationExample: "e.g. SITE-07",
    simFlavor: "construction project",
    typeLabels: {
      safety: "Site safety",
      delay: "Project delay",
      customer_treatment: "Community & client relations",
      outage: "Disruption to services",
    },
    subTypes: {
      safety: ["workplace_injury", "fatality_on_site", "fall_from_height", "structural_collapse", "crane_or_equipment_incident", "fire_or_explosion", "environmental_spill"],
      delay: ["project_delay", "permit_delay", "supply_shortage", "labor_dispute", "weather_stoppage", "cost_overrun"],
      customer_treatment: [...COMMON_TREATMENT, "noise_and_nuisance_complaint", "property_damage_claim", "contract_dispute"],
      outage: ["utility_strike", "road_closure", "site_shutdown", "system_outage"],
      misinformation: [...COMMON_MISINFORMATION, "safety_rumor"],
    },
  },

  // ── Other sectors ─────────────────────────────────────────────────
  Technology: {
    group: "Other",
    operatorLabel: "Company",
    operatorExample: "e.g. Cloudway",
    serviceLabel: "Incident ID",
    locationLabel: "Region/cluster",
    peopleLabel: "Users affected",
    routeLabel: "Region / service",
    serviceExample: "e.g. INC-2291",
    routeExample: "e.g. EU-West",
    locationExample: "e.g. eu-west-1",
    simFlavor: "online service",
    subTypes: {
      safety: ["data_breach", "security_vulnerability", "insider_misconduct", "abuse_on_platform"],
      delay: ["degraded_performance", "release_rollback", "support_backlog", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "account_suspension_dispute", "billing_dispute"],
      outage: ["service_outage", "data_loss", "api_failure", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },
  Education: {
    group: "Other",
    operatorLabel: "Institution",
    operatorExample: "e.g. Westfield University",
    serviceLabel: "Case/reference number",
    locationLabel: "Campus/site code",
    peopleLabel: "Students affected",
    routeLabel: "Campus / program",
    serviceExample: "e.g. CASE-1182",
    routeExample: "e.g. Campus A-B",
    locationExample: "e.g. CAMP-2",
    simFlavor: "class or course",
    subTypes: {
      safety: ["student_harm", "safeguarding_incident", "campus_security_incident", "medical_emergency", "facility_hazard"],
      delay: ["class_cancellation", "results_delay", "admissions_backlog", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "grading_dispute", "fees_dispute"],
      outage: ["learning_platform_outage", "exam_system_failure", "network_outage", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },
  "Government & Public Sector": {
    group: "Other",
    operatorLabel: "Agency",
    operatorExample: "e.g. City Council",
    serviceLabel: "Case/reference number",
    locationLabel: "Office/region code",
    peopleLabel: "Citizens affected",
    routeLabel: "Region / program",
    serviceExample: "e.g. REF-90210",
    routeExample: "e.g. Region North",
    locationExample: "e.g. OFF-15",
    simFlavor: "public service",
    subTypes: {
      safety: ["public_safety_incident", "data_breach", "staff_misconduct", "facility_hazard"],
      delay: ["application_backlog", "benefits_delay", "permit_delay", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "eligibility_dispute"],
      outage: ["portal_outage", "records_system_failure", "payment_system_failure", "network_outage"],
      misinformation: [...COMMON_MISINFORMATION, "policy_misinformation"],
    },
  },
  Manufacturing: {
    group: "Other",
    operatorLabel: "Manufacturer",
    operatorExample: "e.g. Apex Components",
    serviceLabel: "Batch/lot number",
    locationLabel: "Plant/line code",
    peopleLabel: "Customers affected",
    routeLabel: "Supply chain stage",
    serviceExample: "e.g. LOT-55190",
    routeExample: "e.g. Plant A-Distribution",
    locationExample: "e.g. LINE-4",
    simFlavor: "product order",
    typeLabels: { safety: "Product & site safety" },
    subTypes: {
      safety: ["workplace_injury", "product_recall", "product_safety_defect", "environmental_spill", "equipment_failure"],
      delay: ["production_halt", "supply_shortage", "shipment_delay", "staff_shortage"],
      customer_treatment: [...COMMON_TREATMENT, "warranty_dispute"],
      outage: ["plant_system_outage", "erp_system_failure", "network_outage", "app_or_website_down"],
      misinformation: COMMON_MISINFORMATION,
    },
  },
  Other: GENERIC,
};

/** Dropdown order. Groups render as headers; entries keep this order within. */
export const INDUSTRY_GROUPS: Array<{ group: string; values: string[] }> = [
  { group: "Transportation", values: ["Airline", "Rail", "Bus/Coach", "Maritime/Ferry", "Ride-hailing", "Public Transit", "Freight/Logistics"] },
  { group: "Health", values: ["Healthcare"] },
  { group: "Finance", values: ["Financial Services", "Insurance"] },
  { group: "Consumer", values: ["Hospitality & Travel", "Retail & E-commerce", "Food & Beverage"] },
  { group: "Infrastructure", values: ["Energy & Utilities", "Telecommunications"] },
  { group: "Construction", values: ["Construction"] },
  { group: "Other", values: ["Technology", "Education", "Government & Public Sector", "Manufacturing", "Other"] },
];

// Values used by earlier versions of the industry dropdown. Without these a
// deployment still holding an old value would silently fall back to the
// generic profile instead of its real one.
const LEGACY_ALIASES: Record<string, string> = {
  Aviation: "Airline",
  Hospitality: "Hospitality & Travel",
  Retail: "Retail & E-commerce",
  "Banking & Finance": "Financial Services",
  Energy: "Energy & Utilities",
  Government: "Government & Public Sector",
};

export function profileFor(industry: string | null | undefined): IndustryProfile {
  if (!industry) return GENERIC;
  return INDUSTRIES[industry] ?? INDUSTRIES[LEGACY_ALIASES[industry]] ?? GENERIC;
}

/** UI label for an incident type under a given industry. */
export function typeLabel(industry: string | null | undefined, type: IncidentType): string {
  return profileFor(industry).typeLabels?.[type] ?? DEFAULT_TYPE_LABELS[type];
}

/** Human-readable form of a stored sub_type value. */
export function humanizeSubType(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
