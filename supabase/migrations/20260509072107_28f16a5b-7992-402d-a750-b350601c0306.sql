-- Wipe all existing incidents + dependent assets, and unlink mentions
DELETE FROM public.incident_assets;
UPDATE public.social_mentions SET incident_id = NULL, status = 'pending' WHERE incident_id IS NOT NULL;
DELETE FROM public.incidents;

-- Seed Aurora Skylines incidents (L0 → L4 spectrum from the comms manual)
INSERT INTO public.incidents
  (title, incident_type, sub_type, description, airline_name, flight_number, route, airport_code, country,
   injury_fatality, regulator_involved, estimated_passengers_impacted, is_public, influencer_media_involved,
   source, risk, risk_score, status, assignee, approval_status, created_at, updated_at)
VALUES
-- L4 — Critical safety event (lead case)
('Aurora Skylines AS412 MAD–BOG — severe turbulence, diversion to LIS with injuries',
 'safety', 'turbulence_event',
 'Flight AS412 (Madrid–Bogotá, A350-900, 287 PAX) encountered severe clear-air turbulence ~3h into cruise over the North Atlantic. Three passengers and one cabin crew member sustained injuries; aircraft diverted to Lisbon (LIS). Medical teams pre-positioned. CCC fully activated; CIAIAC and EASA notified. Multiple viral videos already circulating across X and TikTok.',
 'Aurora Skylines', 'AS412', 'MAD-BOG', 'LIS', 'Portugal',
 true, true, 287, true, true,
 'internal_ops', 'critical', 92, 'active', 'Elena Navarro', 'approved',
 now() - interval '2 hours', now() - interval '15 minutes'),

-- L3 — Major operational disruption with safety perception risk
('Aurora Skylines AS512 CDG–LIS — emergency landing after cabin smoke report',
 'safety', 'emergency_landing',
 'Flight AS512 (Paris CDG–Lisbon, A321neo) declared PAN-PAN due to smoke reported in the rear galley. Precautionary landing at LIS, emergency slides deployed, all 178 PAX and 6 crew evacuated without serious injury. Aircraft on ground; engineering inspecting. Field communications activated at LIS.',
 'Aurora Skylines', 'AS512', 'CDG-LIS', 'LIS', 'Portugal',
 false, true, 178, true, true,
 'internal_ops', 'critical', 84, 'monitoring', 'João Pereira', 'approved',
 now() - interval '6 hours', now() - interval '1 hour'),

-- L2 — Multi-flight cancellation wave at hub
('Cancellation wave at MAD T4 — overnight crew sickness cluster',
 'delay', 'cancellation_wave',
 '12 short-haul rotations cancelled out of Madrid–Barajas T4 (MAD-BCN, MAD-LIS, MAD-CDG, MAD-FCO) due to a sickness cluster among standby crews. ~1,800 passengers impacted. Rebooking, hotel coordination and EU261 compensation workflows underway with ground handling.',
 'Aurora Skylines', 'AS118', 'MAD-BCN', 'MAD', 'Spain',
 false, false, 1800, true, false,
 'internal_ops', 'high', 74, 'active', 'Marcos Ruiz', 'approved',
 now() - interval '10 hours', now() - interval '30 minutes'),

-- L2 — Reputational / customer treatment, going viral
('Viral TikTok alleging discrimination on AS220 LIS–GRU boarding',
 'customer_treatment', 'discrimination_claim',
 'TikTok clip (>1.2M views in 6h) claims a passenger was denied boarding for language reasons on Aurora Skylines flight AS220 Lisbon–São Paulo. Sentiment trending negative across ES/PT markets. Service Recovery and Corporate Affairs reviewing CCTV and gate logs; holding statement drafted.',
 'Aurora Skylines', 'AS220', 'LIS-GRU', 'LIS', 'Portugal',
 false, false, 1, true, true,
 'social_media', 'high', 68, 'active', 'Inés Carvalho', 'pending',
 now() - interval '8 hours', now() - interval '45 minutes'),

-- L2 — System outage at hub
('Check-in & boarding system outage — MAD Barajas T4',
 'outage', 'checkin_failure',
 'DCS partial outage at MAD T4 from 05:40–07:10 local. Manual boarding activated for 9 departures. No safety impact; minor delays cascaded across the morning bank. Vendor RCA in progress; fallback runbook validated.',
 'Aurora Skylines', 'AS101', 'MAD-LHR', 'MAD', 'Spain',
 false, false, 1450, true, false,
 'internal_ops', 'medium', 55, 'contained', 'Diego Almeida', 'approved',
 now() - interval '1 day', now() - interval '20 hours'),

-- L1 — Misinformation / unverified rumor
('Unverified rumor of emergency landing at LIS attributed to Aurora Skylines',
 'misinformation', 'false_rumor',
 'Aviation-watch accounts on X spreading an unconfirmed claim of an Aurora Skylines emergency landing at LIS. No matching event in OCC logs; ANAC has not been notified. Social Customer Care drafting calm clarification; legal on standby.',
 'Aurora Skylines', NULL, NULL, 'LIS', 'Portugal',
 false, false, 0, true, false,
 'social_media', 'medium', 42, 'monitoring', 'Sofía Beltrán', 'pending',
 now() - interval '4 hours', now() - interval '40 minutes'),

-- L1 — Operational delay with passenger frustration
('Aurora Skylines AS340 MAD–LIM — 4h ground delay, passenger complaints rising',
 'delay', 'flight_delay',
 'Flight AS340 (Madrid–Lima, B787-9) delayed 4h on the apron at MAD due to a technical write-up. 268 PAX onboard; cabin service maintained. Several complaints surfacing on Twitter/X tagging @auroraskylines. Holding messaging prepared.',
 'Aurora Skylines', 'AS340', 'MAD-LIM', 'MAD', 'Spain',
 false, false, 268, true, false,
 'customer_complaint', 'medium', 48, 'active', 'Marcos Ruiz', 'approved',
 now() - interval '5 hours', now() - interval '50 minutes'),

-- L1 — Baggage system issue
('Baggage delivery delays — AS705 LIS–JFK arrivals',
 'delay', 'baggage_system_failure',
 'Belt system issue at JFK T7 caused ~3h baggage delivery delay for inbound AS705. ~24 PIRs filed; no lost bags reported. Station team coordinating courier delivery for affected passengers.',
 'Aurora Skylines', 'AS705', 'LIS-JFK', 'JFK', 'United States',
 false, false, 220, false, false,
 'internal_ops', 'low', 28, 'resolved', 'Lucía Fernández', 'approved',
 now() - interval '2 days', now() - interval '1 day'),

-- L0 — Minor incident, routine
('Minor baggage delay — AS118 BCN–MAD',
 'delay', 'baggage_system_failure',
 'Baggage delivery delayed ~90 minutes on inbound AS118 (Barcelona–Madrid) due to a belt loader fault at BCN. 14 PIRs filed; all bags reunited within 24h. No reputational exposure detected.',
 'Aurora Skylines', 'AS118', 'BCN-MAD', 'BCN', 'Spain',
 false, false, 156, false, false,
 'internal_ops', 'low', 18, 'resolved', 'Sofía Beltrán', 'approved',
 now() - interval '3 days', now() - interval '2 days'),

-- L0 — Weather-driven minor delay
('Weather-related delays at MAD — afternoon thunderstorms',
 'delay', 'airport_disruption',
 'Convective weather over Madrid caused ground stops 14:20–15:10 local. 6 Aurora Skylines departures delayed 30–60 min. Minor knock-on for evening bank; no passenger escalations.',
 'Aurora Skylines', NULL, NULL, 'MAD', 'Spain',
 false, false, 720, false, false,
 'internal_ops', 'low', 12, 'resolved', 'Diego Almeida', 'approved',
 now() - interval '4 days', now() - interval '3 days');