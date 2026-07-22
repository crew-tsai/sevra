// Sevra is scoped to the transportation industry broadly (not every
// industry) — airlines, rail, bus, maritime, ride-hailing, public transit,
// freight. This is the single source of truth for the vocabulary each
// transportation type uses, so labels/placeholders across the app and
// AI prompts stay consistent and are easy to extend.

export const TRANSPORT_TYPES = [
  "Airline",
  "Rail",
  "Bus/Coach",
  "Maritime/Ferry",
  "Ride-hailing",
  "Public Transit",
  "Freight/Logistics",
  "Other",
] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number];

export type TransportVocab = {
  operatorLabel: string;
  serviceLabel: string;
  locationLabel: string;
  peopleLabel: string;
  serviceExample: string;
  routeExample: string;
  locationExample: string;
};

const GENERIC: TransportVocab = {
  operatorLabel: "Operator",
  serviceLabel: "Service ID",
  locationLabel: "Location code",
  peopleLabel: "People impacted",
  serviceExample: "e.g. SVC-4021",
  routeExample: "e.g. Origin-Destination",
  locationExample: "e.g. HUB1",
};

export const TRANSPORT_VOCAB: Record<TransportType, TransportVocab> = {
  Airline: {
    operatorLabel: "Airline",
    serviceLabel: "Flight number",
    locationLabel: "Airport code",
    peopleLabel: "Passengers impacted",
    serviceExample: "e.g. AS412",
    routeExample: "e.g. MAD-BCN",
    locationExample: "e.g. MAD",
  },
  Rail: {
    operatorLabel: "Rail operator",
    serviceLabel: "Train number",
    locationLabel: "Station code",
    peopleLabel: "Passengers impacted",
    serviceExample: "e.g. IC2047",
    routeExample: "e.g. Madrid-Barcelona",
    locationExample: "e.g. MADR",
  },
  "Bus/Coach": {
    operatorLabel: "Bus company",
    serviceLabel: "Route number",
    locationLabel: "Stop/terminal code",
    peopleLabel: "Passengers impacted",
    serviceExample: "e.g. R12",
    routeExample: "e.g. Downtown-Airport",
    locationExample: "e.g. T4",
  },
  "Maritime/Ferry": {
    operatorLabel: "Shipping line",
    serviceLabel: "Voyage number",
    locationLabel: "Port code",
    peopleLabel: "Passengers impacted",
    serviceExample: "e.g. V-3305",
    routeExample: "e.g. Barcelona-Palma",
    locationExample: "e.g. BCN",
  },
  "Ride-hailing": {
    operatorLabel: "Ride-hailing company",
    serviceLabel: "Trip ID",
    locationLabel: "Zone/city code",
    peopleLabel: "Riders impacted",
    serviceExample: "e.g. TRIP-88291",
    routeExample: "e.g. Downtown-Airport",
    locationExample: "e.g. ZONE-3",
  },
  "Public Transit": {
    operatorLabel: "Transit operator",
    serviceLabel: "Line/route number",
    locationLabel: "Station/stop code",
    peopleLabel: "Riders impacted",
    serviceExample: "e.g. Line 4",
    routeExample: "e.g. North-South Line",
    locationExample: "e.g. STN-12",
  },
  "Freight/Logistics": {
    operatorLabel: "Carrier",
    serviceLabel: "Shipment/tracking number",
    locationLabel: "Depot/hub code",
    peopleLabel: "Shipments/customers impacted",
    serviceExample: "e.g. SHP-77213",
    routeExample: "e.g. Warehouse A-Warehouse B",
    locationExample: "e.g. HUB-A",
  },
  Other: GENERIC,
};

export function vocabFor(industry: string | null | undefined): TransportVocab {
  return TRANSPORT_VOCAB[(industry as TransportType) ?? "Other"] ?? GENERIC;
}
