// Mirrors src/lib/transportation.ts — Sevra is scoped to the transportation
// industry broadly (airlines, rail, bus, maritime, ride-hailing, public
// transit, freight), tailored by company_settings.industry. Kept as a
// separate copy (not a shared import across the Vite/Deno boundary) since
// edge functions and the frontend build with different toolchains.

export type TransportVocab = {
  operatorLabel: string;
  serviceLabel: string;
  locationLabel: string;
  peopleLabel: string;
  serviceExample: string;
  routeExample: string;
  locationExample: string;
  simFlavor: string; // short phrase describing the service/vehicle for AI prompt generation
};

const GENERIC: TransportVocab = {
  operatorLabel: "Operator",
  serviceLabel: "Service ID",
  locationLabel: "Location code",
  peopleLabel: "People impacted",
  serviceExample: "SVC-4021",
  routeExample: "Origin-Destination",
  locationExample: "HUB1",
  simFlavor: "transportation service",
};

const VOCAB: Record<string, TransportVocab> = {
  Airline: {
    operatorLabel: "Airline",
    serviceLabel: "Flight number",
    locationLabel: "Airport code",
    peopleLabel: "Passengers impacted",
    serviceExample: "AS412",
    routeExample: "MAD-BCN",
    locationExample: "MAD",
    simFlavor: "airline flight",
  },
  Rail: {
    operatorLabel: "Rail operator",
    serviceLabel: "Train number",
    locationLabel: "Station code",
    peopleLabel: "Passengers impacted",
    serviceExample: "IC2047",
    routeExample: "Madrid-Barcelona",
    locationExample: "MADR",
    simFlavor: "train service",
  },
  "Bus/Coach": {
    operatorLabel: "Bus company",
    serviceLabel: "Route number",
    locationLabel: "Stop/terminal code",
    peopleLabel: "Passengers impacted",
    serviceExample: "R12",
    routeExample: "Downtown-Airport",
    locationExample: "T4",
    simFlavor: "bus route",
  },
  "Maritime/Ferry": {
    operatorLabel: "Shipping line",
    serviceLabel: "Voyage number",
    locationLabel: "Port code",
    peopleLabel: "Passengers impacted",
    serviceExample: "V-3305",
    routeExample: "Barcelona-Palma",
    locationExample: "BCN",
    simFlavor: "ferry crossing",
  },
  "Ride-hailing": {
    operatorLabel: "Ride-hailing company",
    serviceLabel: "Trip ID",
    locationLabel: "Zone/city code",
    peopleLabel: "Riders impacted",
    serviceExample: "TRIP-88291",
    routeExample: "Downtown-Airport",
    locationExample: "ZONE-3",
    simFlavor: "ride",
  },
  "Public Transit": {
    operatorLabel: "Transit operator",
    serviceLabel: "Line/route number",
    locationLabel: "Station/stop code",
    peopleLabel: "Riders impacted",
    serviceExample: "Line 4",
    routeExample: "North-South Line",
    locationExample: "STN-12",
    simFlavor: "transit line",
  },
  "Freight/Logistics": {
    operatorLabel: "Carrier",
    serviceLabel: "Shipment/tracking number",
    locationLabel: "Depot/hub code",
    peopleLabel: "Shipments/customers impacted",
    serviceExample: "SHP-77213",
    routeExample: "Warehouse A-Warehouse B",
    locationExample: "HUB-A",
    simFlavor: "freight shipment",
  },
  Other: GENERIC,
};

export function vocabFor(industry: string | null | undefined): TransportVocab {
  return VOCAB[industry ?? "Other"] ?? GENERIC;
}
