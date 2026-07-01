-- ============================================================
-- SEVRA — Aurora Skylines Demo Seed Data
-- Run with: supabase db seed (or paste into SQL editor)
-- ============================================================

-- ─── 1. Company Settings ─────────────────────────────────────
INSERT INTO public.company_settings (
  id, singleton, company_name, industry,
  brand_primary, brand_secondary,
  monitor_auto_incident_threshold
) VALUES (
  'b0000000-0000-0000-0000-000000000001', true,
  'Aurora Skylines', 'Aviation',
  '#1E40AF', '#0F172A',
  70
) ON CONFLICT (singleton) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  industry     = EXCLUDED.industry,
  brand_primary = EXCLUDED.brand_primary,
  brand_secondary = EXCLUDED.brand_secondary;


-- ─── 2. Incidents (25 rows) ───────────────────────────────────
-- Critical incidents first (referenced by FK below)
INSERT INTO public.incidents (
  id, title, incident_type, sub_type, description,
  airline_name, flight_number, route, airport_code, country,
  injury_fatality, regulator_involved, estimated_passengers_impacted,
  is_public, source, risk, risk_score, crisis_level,
  status, approval_status, created_at
) VALUES
-- === CRITICAL ===
(
  'c1000000-0000-0000-0000-000000000001',
  'Emergency Landing AS118 MAD-BCN — Passenger Medical Distress',
  'safety', 'emergency_landing',
  'Flight AS118 diverted to Valencia following acute cardiac event onboard. Passenger stabilised and transferred to hospital. AESA notified.',
  'Aurora Skylines','AS118','MAD-BCN','MAD','Spain',
  true, true, 189,
  true,'social_media','critical',88,3,
  'active','pending',
  '2026-05-28 09:14:00+00'
),
(
  'c1000000-0000-0000-0000-000000000002',
  'Viral Video: Passenger Removal AS340 CDG-MAD',
  'customer_treatment','passenger_removal',
  'Video showing cabin crew removing a passenger in a wheelchair from flight AS340 has reached 2.3M views. DGAC France requesting incident report.',
  'Aurora Skylines','AS340','CDG-MAD','CDG','France',
  false, true, 210,
  true,'social_media','critical',82,3,
  'monitoring','pending',
  '2026-06-02 14:33:00+00'
),
-- === HIGH ===
(
  'c1000000-0000-0000-0000-000000000003',
  'IT Outage: Check-in Systems Down — T4 Barajas',
  'outage','system_outage',
  'Online check-in and kiosk systems unavailable for 3 hours during peak morning schedule. 6 flights delayed.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,false,1200,
  true,'manual','high',72,2,
  'active','approved',
  '2026-05-15 06:45:00+00'
),
(
  'c1000000-0000-0000-0000-000000000004',
  'Fuel Contamination Scare AS512 LIS-JFK',
  'safety','fuel_contamination',
  'Maintenance crew flagged potential fuel contamination on AS512 pre-departure. Aircraft grounded for inspection. Flight cancelled.',
  'Aurora Skylines','AS512','LIS-JFK','LIS','Portugal',
  false,true,320,
  true,'manual','high',69,2,
  'monitoring','approved',
  '2026-04-22 11:20:00+00'
),
-- === MEDIUM ===
(
  'c1000000-0000-0000-0000-000000000005',
  'Baggage Carousel Failure MAD Terminal 4S',
  'delay','baggage_handling',
  'Carousel 12 at T4S failed during inbound rush. 3 flights affected, 240+ passengers waiting 90+ minutes.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,false,240,
  true,'customer_complaint','medium',45,1,
  'contained','approved',
  '2026-04-10 17:30:00+00'
),
(
  'c1000000-0000-0000-0000-000000000006',
  'Social Media Backlash — AS220 MAD-CDG Meal Allergy',
  'customer_treatment','dietary_incident',
  'Passenger with documented severe nut allergy served incorrect meal on AS220. Twitter campaign #AuroraNutGate accumulating ~50k impressions.',
  'Aurora Skylines','AS220','MAD-CDG','MAD','Spain',
  false,false,1,
  true,'social_media','medium',52,2,
  'monitoring','pending',
  '2026-05-03 20:15:00+00'
),
(
  'c1000000-0000-0000-0000-000000000007',
  'Runway Incursion Near-Miss AS705 at LIS',
  'safety','runway_incursion',
  'AS705 instructed to hold short; aircraft crossed hold line. Investigated by NAV Portugal ANAC. No injuries.',
  'Aurora Skylines','AS705','LIS-GRU','LIS','Portugal',
  false,true,340,
  true,'regulator','medium',58,2,
  'active','approved',
  '2026-03-18 07:55:00+00'
),
(
  'c1000000-0000-0000-0000-000000000008',
  'Strike Threat — Ground Handlers SITCPLA Union',
  'delay','strike_threat',
  'SITCPLA announced 72h notice of ground handler walkout at MAD, LIS, and BCN affecting Aurora Skylines operations.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,false,8000,
  true,'news','medium',48,1,
  'monitoring','approved',
  '2026-03-05 09:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000009',
  'Data Breach — Loyalty Programme Tier 3 Accounts',
  'customer_treatment','data_breach',
  'Unauthorised access to 12,000 loyalty accounts detected. Passwords reset. AEPD notified as per GDPR Art. 33.',
  'Aurora Skylines',NULL,NULL,NULL,'Spain',
  false,true,12000,
  true,'manual','medium',61,2,
  'active','pending',
  '2026-04-01 23:45:00+00'
),
(
  'c1000000-0000-0000-0000-000000000010',
  'Bird Strike AS412 MAD-BOG — Engine 2 Shutdown',
  'safety','bird_strike',
  'Bird strike at 4,500ft caused engine 2 precautionary shutdown. Aircraft landed safely at MAD. 0 injuries.',
  'Aurora Skylines','AS412','MAD-BOG','MAD','Spain',
  false,true,287,
  true,'manual','medium',55,2,
  'resolved','approved',
  '2026-03-29 15:10:00+00'
),
-- === LOW ===
(
  'c1000000-0000-0000-0000-000000000011',
  'Lounge Closure — AS Gold Lounge T4 Renovation',
  'delay','facility_closure',
  'Gold lounge closed for scheduled renovation. Signage failure caused confusion. Complaints on social media.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,false,800,
  false,'customer_complaint','low',18,0,
  'resolved','approved',
  '2026-02-14 08:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000012',
  'Website Booking Error — Duplicate Charges',
  'outage','payment_error',
  '43 customers double-charged during a payment gateway timeout. Finance initiating refunds.',
  'Aurora Skylines',NULL,NULL,NULL,'Spain',
  false,false,43,
  false,'manual','low',25,0,
  'resolved','approved',
  '2026-02-20 14:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000013',
  'Tarmac Delay AS118 MAD-BCN — 90min ATC Hold',
  'delay','delay',
  'ATC ground stop at BCN due to thunderstorms caused 90-min tarmac delay. Passenger complaints filed.',
  'Aurora Skylines','AS118','MAD-BCN','BCN','Spain',
  false,false,165,
  false,'customer_complaint','low',20,0,
  'resolved','approved',
  '2026-02-05 11:30:00+00'
),
(
  'c1000000-0000-0000-0000-000000000014',
  'Crew Rest Violation — AS705 LIS-GRU Scheduling Error',
  'safety','crew_rest_violation',
  'Scheduling error resulted in crew operating AS705 with inadequate rest. Self-reported to ANAC.',
  'Aurora Skylines','AS705','LIS-GRU','LIS','Portugal',
  false,true,340,
  false,'regulator','low',30,1,
  'contained','approved',
  '2026-01-28 09:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000015',
  'Gate Agent Altercation — Passenger Complaint AS220',
  'customer_treatment','staff_misconduct',
  'Customer filed formal complaint alleging verbal altercation with gate agent at CDG. HR investigating.',
  'Aurora Skylines','AS220','CDG-MAD','CDG','France',
  false,false,1,
  false,'customer_complaint','low',15,0,
  'resolved','rejected',
  '2026-01-15 18:45:00+00'
),
(
  'c1000000-0000-0000-0000-000000000016',
  'Cargo Hold Smoke Alert — False Alarm AS340',
  'safety','smoke_alert',
  'Cargo hold smoke detector activated on AS340 pre-departure. Investigation found detector malfunction. Aircraft returned to service.',
  'Aurora Skylines','AS340','MAD-LIM','MAD','Spain',
  false,false,210,
  false,'manual','low',22,0,
  'resolved','approved',
  '2026-01-08 07:15:00+00'
),
(
  'c1000000-0000-0000-0000-000000000017',
  'Minor Oil Leak AS512 — Precautionary Gate Return',
  'safety','mechanical_issue',
  'Precautionary gate return after engineer flagged minor hydraulic oil seep. Aircraft inspected and cleared.',
  'Aurora Skylines','AS512','LIS-JFK','LIS','Portugal',
  false,false,320,
  false,'manual','low',28,0,
  'resolved','approved',
  '2025-12-29 13:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000018',
  'Lost Infant Cot — AS705 BOG Turnaround',
  'delay','baggage_handling',
  'Infant travel cot not transferred during turnaround at BOG. Item recovered 48h later.',
  'Aurora Skylines','AS705','MAD-BOG','BOG','Colombia',
  false,false,1,
  false,'customer_complaint','low',12,0,
  'resolved','approved',
  '2025-12-21 10:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000019',
  'Social Post Misattribution — Third-Party Incident Wrongly Linked',
  'misinformation','misattribution',
  'Viral tweet about a different airline wrongly attributed to Aurora Skylines. Comms team issued correction.',
  'Aurora Skylines',NULL,NULL,NULL,NULL,
  false,false,0,
  false,'social_media','low',10,0,
  'resolved','approved',
  '2025-12-15 15:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000020',
  'App Crash During Holiday Peak — iOS v3.2.1',
  'outage','app_outage',
  'AS iOS app crashed for 2h during Christmas travel peak. Android unaffected. 1,200 estimated users impacted.',
  'Aurora Skylines',NULL,NULL,NULL,'Spain',
  false,false,1200,
  false,'manual','low',25,0,
  'resolved','approved',
  '2025-12-10 09:30:00+00'
),
-- Fill remaining months (Jan–Apr, misc)
(
  'c1000000-0000-0000-0000-000000000021',
  'Weather Disruption — 18 Cancellations MAD Snowstorm',
  'delay','weather_cancellation',
  'Exceptional snowstorm at MAD caused 18 cancellations and 40+ delays. AEMET issued red alert.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,false,4200,
  true,'news','medium',43,1,
  'resolved','approved',
  '2026-01-11 06:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000022',
  'Fuel Price Surge — Emergency Board Briefing',
  'delay','fuel_costs',
  'Jet fuel spot price exceeded €1,400/MT. Board requested crisis communications brief on public messaging strategy.',
  'Aurora Skylines',NULL,NULL,NULL,NULL,
  false,false,0,
  false,'manual','medium',40,1,
  'contained','approved',
  '2026-02-28 16:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000023',
  'Catering Complaint Spike — AS MEX Route',
  'customer_treatment','food_quality',
  'Spike in catering complaints on MAD-MEX route. 14 reports of cold meals and missing special orders in one week.',
  'Aurora Skylines',NULL,'MAD-MEX','MAD','Mexico',
  false,false,14,
  false,'customer_complaint','low',15,0,
  'resolved','approved',
  '2026-03-12 11:00:00+00'
),
(
  'c1000000-0000-0000-0000-000000000024',
  'Unruly Passenger — AS412 MAD-JFK Diversion to BOS',
  'safety','unruly_passenger',
  'Passenger physically restrained by cabin crew and handed to law enforcement at BOS after threatening behaviour.',
  'Aurora Skylines','AS412','MAD-JFK','BOS','United States',
  false,true,289,
  true,'manual','high',65,2,
  'active','pending',
  '2026-04-18 03:20:00+00'
),
(
  'c1000000-0000-0000-0000-000000000025',
  'Regulator Audit — AESA Ramp Inspection MAD',
  'safety','regulator_audit',
  'AESA unannounced ramp inspection at MAD. Two aircraft grounded pending documentation review. Expected clearance within 48h.',
  'Aurora Skylines',NULL,'MAD','MAD','Spain',
  false,true,0,
  false,'regulator','medium',50,1,
  'active','pending',
  '2026-05-20 10:00:00+00'
);


-- ─── 3. Social Mentions (50 rows) ────────────────────────────
INSERT INTO public.social_mentions (
  id, channel, author_name, author_handle, content,
  post_url, likes, shares, reach,
  is_verified, is_influencer,
  ai_risk, ai_risk_score, ai_summary, ai_incident_type,
  status, incident_id,
  posted_at, created_at
) VALUES
-- Linked to INC_CRITICAL_1 (AS118 emergency landing)
('d1000000-0000-0000-0000-000000000001','twitter','Carla Méndez','carlamendez',
 'Llevamos 4 horas en pista en MAD vuelo AS118 a BCN sin información. Hay una señora mayor descompensada y nadie del crew responde 😡 @auroraskylines',
 'https://twitter.com/i/web/status/1001','1240','320',84000,false,false,
 'critical',88,'Passenger medical emergency onboard AS118, crew unresponsive to emergency.','safety',
 'incident_created','c1000000-0000-0000-0000-000000000001',
 '2026-05-28 08:50:00+00','2026-05-28 08:55:00+00'),
('d1000000-0000-0000-0000-000000000002','instagram','Sara López','saralopez_mrd',
 'Aterrizaje de emergencia del AS118 en Valencia confirmado por el capitán. Todos bien gracias a dios. #AuroraSkylines',
 'https://instagram.com/p/demo002',980,210,44000,false,true,
 'critical',80,'Emergency diversion confirmed by captain, AS118 emergency landing Valencia.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000001',
 '2026-05-28 09:05:00+00','2026-05-28 09:10:00+00'),
('d1000000-0000-0000-0000-000000000003','twitter','AviationHerald','avherald',
 'BREAKING: @auroraskylines AS118 diverted to VLC with medical emergency onboard. Aircraft on ground, emergency services met the flight.',
 'https://twitter.com/i/web/status/1003',3200,1100,210000,true,true,
 'critical',92,'Verified news account reporting AS118 diversion to Valencia with medical emergency.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000001',
 '2026-05-28 09:20:00+00','2026-05-28 09:25:00+00'),
('d1000000-0000-0000-0000-000000000004','tiktok','Pedro G.','pedrogfly',
 'Estaba en el vuelo AS118 y os cuento lo que pasó. El equipo de cabina fue increíble, respondieron en 2 minutos.',
 NULL,4500,1800,320000,false,true,
 'medium',40,'Eyewitness account praising crew response during AS118 medical emergency.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000001',
 '2026-05-28 11:30:00+00','2026-05-28 11:35:00+00'),
('d1000000-0000-0000-0000-000000000005','facebook','Grupo Pasajeros MAD','pasajerosmad',
 '@auroraskylines cuándo habrá comunicado oficial sobre el AS118? Los familiares no tienen información.',
 'https://facebook.com/groups/demo005',88,34,12000,false,false,
 'high',65,'Families requesting official communication about AS118 incident.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000001',
 '2026-05-28 10:00:00+00','2026-05-28 10:05:00+00'),

-- Linked to INC_CRITICAL_2 (viral passenger removal)
('d1000000-0000-0000-0000-000000000006','twitter','Marta García','martagarcia_cdg',
 'Cómo puede @auroraskylines sacar a la fuerza a una persona en silla de ruedas del AS340 en CDG? VIDEO: [link] #AuroraShame',
 'https://twitter.com/i/web/status/1006',8900,4200,580000,false,true,
 'critical',85,'Viral video of forced wheelchair passenger removal from AS340.','customer_treatment',
 'incident_created','c1000000-0000-0000-0000-000000000002',
 '2026-06-02 14:10:00+00','2026-06-02 14:15:00+00'),
('d1000000-0000-0000-0000-000000000007','instagram','DisabilityRights_EU','dr_eu',
 'This is unacceptable. @auroraskylines violated EU Regulation 1107/2006 protecting disabled air passengers. We are filing a formal complaint. #AccessibilityRights',
 'https://instagram.com/p/demo007',12000,6800,890000,true,true,
 'critical',88,'Disability rights NGO announcing formal regulatory complaint against Aurora Skylines.','customer_treatment',
 'linked_to_incident','c1000000-0000-0000-0000-000000000002',
 '2026-06-02 15:30:00+00','2026-06-02 15:35:00+00'),
('d1000000-0000-0000-0000-000000000008','tiktok','TravelWithMike','travelwithmike',
 'The @auroraskylines video is everywhere now. 2.3M views. This is a textbook PR crisis. Thread 🧵',
 NULL,5400,2100,430000,false,true,
 'high',72,'Travel influencer amplifying viral passenger removal story.','customer_treatment',
 'linked_to_incident','c1000000-0000-0000-0000-000000000002',
 '2026-06-02 16:00:00+00','2026-06-02 16:05:00+00'),
('d1000000-0000-0000-0000-000000000009','twitter','LeParisien','leparisien',
 'EXCLUSIF: Une passagère en fauteuil roulant débarquée de force sur un vol @auroraskylines CDG-MAD. La DGAC ouvre une enquête.',
 'https://twitter.com/i/web/status/1009',3100,1400,280000,true,true,
 'critical',90,'Major French newspaper reporting DGAC investigation into Aurora Skylines wheelchair passenger incident.','customer_treatment',
 'linked_to_incident','c1000000-0000-0000-0000-000000000002',
 '2026-06-03 08:00:00+00','2026-06-03 08:05:00+00'),
('d1000000-0000-0000-0000-000000000010','facebook','Consumer Rights Spain','crsorg',
 'Estamos recopilando testimonios sobre @auroraskylines. Si has sufrido discriminación por discapacidad, contactanos.',
 'https://facebook.com/groups/demo010',450,220,34000,true,false,
 'high',68,'Consumer rights org collecting testimonies about Aurora Skylines disability discrimination.','customer_treatment',
 'linked_to_incident','c1000000-0000-0000-0000-000000000002',
 '2026-06-03 10:00:00+00','2026-06-03 10:05:00+00'),

-- Standalone mentions — various channels & months
('d1000000-0000-0000-0000-000000000011','twitter','FlightRadar24','flightradar24',
 '@auroraskylines AS512 has been on the ground at LIS for 6h. Fuel contamination?',
 'https://twitter.com/i/web/status/1011',2100,890,190000,true,true,
 'high',70,'Aviation tracker reporting prolonged ground hold, speculating fuel contamination.','safety',
 'incident_created','c1000000-0000-0000-0000-000000000004',
 '2026-04-22 12:00:00+00','2026-04-22 12:05:00+00'),
('d1000000-0000-0000-0000-000000000012','instagram','TechTraveler_EU','techtravelereu',
 '@auroraskylines app is down again. Cannot check in. Queue at T4 is ridiculous.',
 'https://instagram.com/p/demo012',890,320,65000,false,false,
 'medium',48,'App outage complaint during peak hours at T4.','operational',
 'incident_created','c1000000-0000-0000-0000-000000000003',
 '2026-05-15 07:00:00+00','2026-05-15 07:05:00+00'),
('d1000000-0000-0000-0000-000000000013','twitter','AliciaFlores','aliciafloresv',
 'Llevan 90 minutos en la pista del AS118 MAD-BCN y no dan agua. Vergonzoso @auroraskylines',
 'https://twitter.com/i/web/status/1013',340,120,28000,false,false,
 'medium',45,'Passenger reporting tarmac delay without water service.','operational',
 'dismissed',NULL,
 '2026-02-05 12:00:00+00','2026-02-05 12:05:00+00'),
('d1000000-0000-0000-0000-000000000014','tiktok','AvionesYMas','avionesymas',
 'AESA acaba de inspeccionar 2 aviones de @auroraskylines en MAD y los han inmovilizado. Esto se pone serio.',
 NULL,3200,1400,240000,false,true,
 'high',62,'Aviation influencer reporting AESA ramp inspection grounding 2 aircraft.','regulatory',
 'incident_created','c1000000-0000-0000-0000-000000000025',
 '2026-05-20 11:00:00+00','2026-05-20 11:05:00+00'),
('d1000000-0000-0000-0000-000000000015','reddit','u/madridsairport','madridsairport',
 'Anyone else having issues with Aurora Skylines check-in kiosks at T4? All 8 machines showing error screens.',
 'https://reddit.com/r/aviation/comments/demo015',180,45,9000,false,false,
 'medium',42,'Reddit report of widespread kiosk failures at T4.','operational',
 'linked_to_incident','c1000000-0000-0000-0000-000000000003',
 '2026-05-15 07:30:00+00','2026-05-15 07:35:00+00'),
('d1000000-0000-0000-0000-000000000016','twitter','ExpandedTravel','expandedtravel',
 'Great flight on @auroraskylines AS220 MAD-CDG today. On time, friendly crew, lovely inflight menu. #TravelTuesday',
 'https://twitter.com/i/web/status/1016',120,30,8500,false,false,
 'low',5,'Positive tweet about Aurora Skylines MAD-CDG service.','general',
 'dismissed',NULL,
 '2026-03-04 14:00:00+00','2026-03-04 14:05:00+00'),
('d1000000-0000-0000-0000-000000000017','instagram','FrequentFlyerES','frequentflyeres',
 'Por fin @auroraskylines anuncia el programa de lealtad renovado. Esperando detalles del nuevo tier. #AvGeek',
 'https://instagram.com/p/demo017',560,180,42000,false,true,
 'low',8,'Positive sentiment about Aurora Skylines loyalty programme announcement.','general',
 'dismissed',NULL,
 '2026-01-20 10:00:00+00','2026-01-20 10:05:00+00'),
('d1000000-0000-0000-0000-000000000018','facebook','Noticias Aviacion','noticiasaviacion',
 'HUELGA: Handlers de @auroraskylines en MAD, LIS y BCN anuncian paro de 72h. Posibles cancelaciones masivas.',
 'https://facebook.com/noticiasaviacion/demo018',2100,980,145000,true,true,
 'high',68,'News page reporting 72h ground handler strike at Aurora Skylines hubs.','labor',
 'incident_created','c1000000-0000-0000-0000-000000000008',
 '2026-03-05 09:30:00+00','2026-03-05 09:35:00+00'),
('d1000000-0000-0000-0000-000000000019','twitter','CyberSecIberia','cyberseciberia',
 'Alerta: credenciales de programa fidelidad @auroraskylines aparecen en dump online. Recomendamos cambiar contraseña urgente.',
 'https://twitter.com/i/web/status/1019',4500,2200,310000,false,true,
 'critical',78,'Cybersecurity account alerting about Aurora Skylines loyalty data breach.','reputational',
 'incident_created','c1000000-0000-0000-0000-000000000009',
 '2026-04-02 08:00:00+00','2026-04-02 08:05:00+00'),
('d1000000-0000-0000-0000-000000000020','reddit','u/infosec_lurker','infosec_lurker',
 'Found 12k Aurora Skylines loyalty accounts in a breach database. Notified their security team yesterday, no response yet.',
 'https://reddit.com/r/netsec/comments/demo020',890,340,52000,false,false,
 'critical',80,'Security researcher reporting data breach and lack of vendor response.','reputational',
 'linked_to_incident','c1000000-0000-0000-0000-000000000009',
 '2026-04-02 09:00:00+00','2026-04-02 09:05:00+00'),
-- Filler mentions across months for chart coverage
('d1000000-0000-0000-0000-000000000021','twitter','JohnFliesA','johnfliesa',
 '@auroraskylines lost my bag on AS705 LIS-GRU. Day 3, still no update from baggage services.',
 'https://twitter.com/i/web/status/1021',88,12,4200,false,false,'medium',38,'Baggage delay complaint.','operational','dismissed',NULL,
 '2025-12-05 15:00:00+00','2025-12-05 15:05:00+00'),
('d1000000-0000-0000-0000-000000000022','instagram','LuisaViaja','luisaviaja',
 'Viaje perfecto con @auroraskylines a Lisboa hoy! Salida puntual y asientos nuevos 😍',
 'https://instagram.com/p/demo022',340,80,22000,false,false,'low',4,'Positive travel post.','general','dismissed',NULL,
 '2025-12-12 18:00:00+00','2025-12-12 18:05:00+00'),
('d1000000-0000-0000-0000-000000000023','tiktok','AviosAddicted','aviosaddicted',
 'AS118 retrasado 45 min por congestión de tráfico en BCN. Normal para navidades.',
 NULL,120,20,8000,false,false,'low',12,'Minor delay complaint, seasonal context.','operational','dismissed',NULL,
 '2025-12-22 11:00:00+00','2025-12-22 11:05:00+00'),
('d1000000-0000-0000-0000-000000000024','facebook','Foro Pasajeros','foropasajeros',
 'Queja formal enviada a @auroraskylines por cobro doble en reserva web. ¿Alguien más afectado?',
 'https://facebook.com/groups/demo024',45,22,3200,false,false,'medium',30,'Double charge complaint.','operational','dismissed',NULL,
 '2026-02-21 10:00:00+00','2026-02-21 10:05:00+00'),
('d1000000-0000-0000-0000-000000000025','reddit','u/budget_flyer_es','budget_flyer_es',
 'Aurora Skylines added hidden fees again. €12 for seat selection that used to be free. Anyone know if this is permanent?',
 'https://reddit.com/r/Flights/comments/demo025',320,88,18000,false,false,'low',15,'Fee complaint.','operational','dismissed',NULL,
 '2026-01-25 09:00:00+00','2026-01-25 09:05:00+00'),
('d1000000-0000-0000-0000-000000000026','twitter','AirlineWatcher','airlinewatcher',
 '@auroraskylines fuel contamination on LIS-JFK grounded for 6h. Any official statement?',
 'https://twitter.com/i/web/status/1026',1800,720,130000,false,true,'high',66,'Media asking for official response on fuel contamination.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000004',
 '2026-04-22 13:00:00+00','2026-04-22 13:05:00+00'),
('d1000000-0000-0000-0000-000000000027','instagram','NutsAllergyWarrior','nutsallergywarrior',
 'I could have DIED on @auroraskylines AS220 today. They gave me a nut-based meal despite a documented allergy on file. Unacceptable.',
 'https://instagram.com/p/demo027',4200,1800,280000,false,true,'critical',82,'Passenger allergy incident with potential life-threatening severity.','customer_treatment',
 'incident_created','c1000000-0000-0000-0000-000000000006',
 '2026-05-03 20:00:00+00','2026-05-03 20:05:00+00'),
('d1000000-0000-0000-0000-000000000028','twitter','ElPaisViajes','elpaisviajes',
 'Borrasca histórica cierra el aeropuerto de Madrid. @auroraskylines cancela 18 vuelos. Caos en T4.',
 'https://twitter.com/i/web/status/1028',2800,1100,210000,true,true,'medium',45,'News reporting weather cancellations.','operational',
 'linked_to_incident','c1000000-0000-0000-0000-000000000021',
 '2026-01-11 06:30:00+00','2026-01-11 06:35:00+00'),
('d1000000-0000-0000-0000-000000000029','tiktok','AvGeekSpain','avgeekspain',
 'Aves golpean motor 2 del AS412 MAD-BOG poco después del despegue. Regresa a Barajas sano y salvo. Crew profesional al 100%.',
 NULL,6800,3200,520000,false,true,'medium',55,'Bird strike eyewitness account, positive crew mention.','safety',
 'linked_to_incident','c1000000-0000-0000-0000-000000000010',
 '2026-03-29 15:30:00+00','2026-03-29 15:35:00+00'),
('d1000000-0000-0000-0000-000000000030','reddit','u/cdg_frequent','cdg_frequent',
 'Anyone else seen the Aurora Skylines wheelchair video? This is not an isolated incident in CDG Terminal 2E.',
 'https://reddit.com/r/aviation/comments/demo030',1200,450,68000,false,false,'high',70,'Reddit amplification of wheelchair removal incident.','customer_treatment',
 'linked_to_incident','c1000000-0000-0000-0000-000000000002',
 '2026-06-02 17:00:00+00','2026-06-02 17:05:00+00'),
-- Additional filler to reach 50
('d1000000-0000-0000-0000-000000000031','twitter','PaxRightsEU','paxrightseu','EU261 claim against @auroraskylines for 4h delay on AS412 MIA-MAD. They refused. Anyone else?','https://twitter.com/i/web/status/1031',210,80,14000,false,false,'low',20,'EU261 complaint.','operational','dismissed',NULL,'2026-03-22 09:00:00+00','2026-03-22 09:05:00+00'),
('d1000000-0000-0000-0000-000000000032','instagram','TravelerMiguel','travelermiguel','Surprisingly good food on @auroraskylines long-haul to MEX today. Business class upgrade well worth it.','https://instagram.com/p/demo032',680,140,48000,false,false,'low',3,'Positive business class experience.','general','dismissed',NULL,'2026-04-05 20:00:00+00','2026-04-05 20:05:00+00'),
('d1000000-0000-0000-0000-000000000033','tiktok','AirportDrama','airportdrama','La huelga de handlers en @auroraskylines confirmada. Arranca mañana a las 00:00. #Viajeros cuidado.',NULL,3400,1600,240000,false,true,'high',66,'Strike confirmation TikTok.','labor','linked_to_incident','c1000000-0000-0000-0000-000000000008','2026-03-06 18:00:00+00','2026-03-06 18:05:00+00'),
('d1000000-0000-0000-0000-000000000034','facebook','AviacionSegura','aviacionsegura','Incursión de pista de @auroraskylines en LIS. ANAC investiga. Seguridad aérea NO es negociable.','https://facebook.com/aviacionsegura/demo034',1200,580,88000,true,true,'high',64,'Aviation safety org reporting runway incursion investigation.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000007','2026-03-18 09:00:00+00','2026-03-18 09:05:00+00'),
('d1000000-0000-0000-0000-000000000035','reddit','u/lisbon_avi_fan','lisbon_avi_fan','Confirmed: Aurora Skylines AS705 crossed hold line at LIS. ATC audio leaked on LiveATC.','https://reddit.com/r/aviation/comments/demo035',880,320,52000,false,false,'high',65,'Leaked ATC audio of runway incursion.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000007','2026-03-19 11:00:00+00','2026-03-19 11:05:00+00'),
('d1000000-0000-0000-0000-000000000036','twitter','FlyingLegal','flyinglegal','Passenger on @auroraskylines claims he was verbally abused by gate agent at CDG. Our firm is looking into this. #PassengerRights','https://twitter.com/i/web/status/1036',540,210,38000,false,false,'medium',42,'Legal firm posting about gate agent complaint.','customer_treatment','dismissed',NULL,'2026-01-16 10:00:00+00','2026-01-16 10:05:00+00'),
('d1000000-0000-0000-0000-000000000037','instagram','CrisisCommsWatch','crisiscommswatch','How NOT to handle a crisis: @auroraskylines silent for 6h after the AS118 diversion. PR fail.','https://instagram.com/p/demo037',890,380,62000,false,true,'high',68,'PR critic calling out crisis communications failure.','reputational','linked_to_incident','c1000000-0000-0000-0000-000000000001','2026-05-28 15:00:00+00','2026-05-28 15:05:00+00'),
('d1000000-0000-0000-0000-000000000038','tiktok','TurismoMadrid','turismomadrid','El vuelo AS118 que aterrizó de emergencia en Valencia — el piloto fue increíble. Un aplauso 👏',NULL,9200,4100,680000,false,true,'medium',35,'Positive hero narrative around AS118 pilot.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000001','2026-05-28 18:00:00+00','2026-05-28 18:05:00+00'),
('d1000000-0000-0000-0000-000000000039','facebook','ParisAeroNews','parisaeronews','La DGAC a ouvert une enquête formelle sur @auroraskylines suite à l''incident du passager en fauteuil roulant sur le vol CDG-MAD.','https://facebook.com/parisaeronews/demo039',1800,820,130000,true,true,'critical',86,'French regulator probe news coverage.','customer_treatment','linked_to_incident','c1000000-0000-0000-0000-000000000002','2026-06-03 12:00:00+00','2026-06-03 12:05:00+00'),
('d1000000-0000-0000-0000-000000000040','reddit','u/disabled_traveler_fr','disabled_traveler_fr','What Aurora Skylines did on AS340 is unfortunately common. I have been removed from a flight before too. Airlines need accountability.','https://reddit.com/r/disability/comments/demo040',2200,890,140000,false,false,'high',72,'Disability community member sharing personal story.','customer_treatment','linked_to_incident','c1000000-0000-0000-0000-000000000002','2026-06-04 09:00:00+00','2026-06-04 09:05:00+00'),
('d1000000-0000-0000-0000-000000000041','twitter','AirlineAnalyst','airlineanalyst','@auroraskylines data breach affecting 12k loyalty members. GDPR fine risk: up to €2.4M or 4% annual turnover. Class action likely.','https://twitter.com/i/web/status/1041',3400,1500,240000,false,true,'critical',80,'Financial/legal analysis of data breach exposure.','reputational','linked_to_incident','c1000000-0000-0000-0000-000000000009','2026-04-03 08:00:00+00','2026-04-03 08:05:00+00'),
('d1000000-0000-0000-0000-000000000042','instagram','SecurityMindset','securitymindset','@auroraskylines breach response was fast — password resets done within 4h. AEPD notified. Good incident response.','https://instagram.com/p/demo042',320,110,22000,false,false,'medium',35,'Security professional praising incident response.','reputational','linked_to_incident','c1000000-0000-0000-0000-000000000009','2026-04-04 10:00:00+00','2026-04-04 10:05:00+00'),
('d1000000-0000-0000-0000-000000000043','tiktok','TikAviation','tikaviation','Pasajero no-docil en AS412 MAD-JFK obligó al avión a aterrizar en Boston. Tripulación de cabina heroes 🙌',NULL,12000,5400,840000,false,true,'high',66,'TikTok viral video about unruly passenger diversion.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000024','2026-04-18 08:00:00+00','2026-04-18 08:05:00+00'),
('d1000000-0000-0000-0000-000000000044','facebook','BostonHerald','bostonherald','Aurora Skylines flight from Madrid diverted to Logan after disruptive passenger. Crew praised for handling.','https://facebook.com/bostonherald/demo044',980,380,88000,true,true,'medium',45,'US local news covering diversion.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000024','2026-04-18 09:00:00+00','2026-04-18 09:05:00+00'),
('d1000000-0000-0000-0000-000000000045','reddit','u/aviation_nerd_mad','aviation_nerd_mad','AESA audit at MAD grounded 2 AS planes. Anyone have more details? Seems like documentation issue.','https://reddit.com/r/aviation/comments/demo045',560,180,32000,false,false,'medium',48,'Reddit speculation about AESA audit.','regulatory','linked_to_incident','c1000000-0000-0000-0000-000000000025','2026-05-20 12:00:00+00','2026-05-20 12:05:00+00'),
('d1000000-0000-0000-0000-000000000046','twitter','NachoMéndez','nachomendez_mad','Cuarto día sin maleta. @auroraskylines ignorando todos los mensajes. Esto es vergonzoso.','https://twitter.com/i/web/status/1046',88,24,5600,false,false,'low',18,'Baggage delay complaint.','operational','dismissed',NULL,'2026-02-10 11:00:00+00','2026-02-10 11:05:00+00'),
('d1000000-0000-0000-0000-000000000047','instagram','EcoAviationEU','ecoaviationeu','@auroraskylines just announced SAF partnership with Repsol. Great step toward net-zero. 🌿','https://instagram.com/p/demo047',1200,480,88000,false,true,'low',5,'Positive sustainability news.','general','dismissed',NULL,'2026-03-01 10:00:00+00','2026-03-01 10:05:00+00'),
('d1000000-0000-0000-0000-000000000048','tiktok','MexicoFlyer','mexicoflyer','Comida mala en el AS703 MAD-MEX de hoy. Tercera vez que me pasa. @auroraskylines necesitan cambiar el proveedor.',NULL,320,88,24000,false,false,'low',14,'Catering complaint on MEX route.','customer_treatment','linked_to_incident','c1000000-0000-0000-0000-000000000023','2026-03-13 10:00:00+00','2026-03-13 10:05:00+00'),
('d1000000-0000-0000-0000-000000000049','facebook','LaborRightsES','laborightses','Apoyamos la huelga de los handlers de @auroraskylines. Los trabajadores merecen condiciones dignas.','https://facebook.com/laborrightses/demo049',2400,1100,170000,true,true,'medium',44,'Labor rights org supporting ground handler strike.','labor','linked_to_incident','c1000000-0000-0000-0000-000000000008','2026-03-07 09:00:00+00','2026-03-07 09:05:00+00'),
('d1000000-0000-0000-0000-000000000050','reddit','u/kerosene_karen','kerosene_karen','Does anyone know the timeline of the AS512 fuel contamination? Was it actually confirmed or just a precaution?','https://reddit.com/r/aviation/comments/demo050',240,68,14000,false,false,'medium',38,'Reddit inquiry about fuel contamination scope.','safety','linked_to_incident','c1000000-0000-0000-0000-000000000004','2026-04-23 09:00:00+00','2026-04-23 09:05:00+00');


-- ─── 4. Incident Assets (22 rows — full packages for critical incidents) ─────
-- 11 assets for INC_CRITICAL_1 (AS118 emergency landing)
INSERT INTO public.incident_assets (
  id, incident_id, asset_type, title, content,
  approval_status, created_at
) VALUES
('e1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',
 'press_release','Press Release: Emergency Landing AS118 Valencia',
 'FOR IMMEDIATE RELEASE — Aurora Skylines confirms that flight AS118 (Madrid-Barcelona) performed a precautionary diversion to Valencia Airport at 09:14 CET today following a medical emergency onboard. Emergency services met the aircraft and the passenger received prompt medical attention. All other 188 passengers and 6 crew members are safe. Aurora Skylines is fully cooperating with AESA and has notified all relevant authorities. A full investigation is underway. We extend our sincerest wishes for the recovery of the passenger involved.',
 'approved','2026-05-28 10:00:00+00'),
('e1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001',
 'social_twitter','Twitter Statement — AS118 Emergency Landing',
 'UPDATE: AS118 has safely diverted to Valencia following a medical emergency onboard. Emergency services have attended the passenger. All crew and passengers are safe. We are in contact with all affected customers. Full statement at [link] #AuroraSkylines',
 'approved','2026-05-28 10:05:00+00'),
('e1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001',
 'social_instagram','Instagram Statement — AS118',
 'Our crew responded swiftly to a medical emergency onboard AS118 this morning, diverting to Valencia to ensure the passenger received the care they needed. We are proud of our crew''s professionalism and extend our thoughts to the passenger and their family. Full details in bio link.',
 'approved','2026-05-28 10:10:00+00'),
('e1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000001',
 'customer_email','Customer Email — AS118 Affected Passengers',
 'Dear Aurora Skylines passenger, We are writing to inform you about the diversion of your flight AS118 from Madrid to Barcelona this morning. Due to a medical emergency onboard, Captain García made the decision to divert to Valencia Airport to ensure the immediate care of a fellow passenger. We understand this caused disruption to your travel plans and sincerely apologise. You are entitled to meal vouchers and rebooking without charge. Please visit the Aurora Skylines service desk in Valencia arrivals.',
 'approved','2026-05-28 10:20:00+00'),
('e1000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000001',
 'faq','FAQ Document — AS118 Emergency Landing',
 'Q: Was the emergency landing planned? A: No, the diversion was an unplanned precautionary measure following a passenger medical event. Q: Was there any danger to the aircraft? A: No. The aircraft landed normally at Valencia. Q: What happens to my connection? A: Aurora Skylines will rebook all affected passengers at no charge. Q: Is the passenger okay? A: We cannot share medical information, but can confirm the passenger received prompt care. Q: Will there be a formal investigation? A: Yes, Aurora Skylines is cooperating with AESA per standard procedure.',
 'approved','2026-05-28 10:30:00+00'),
('e1000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000001',
 'media_briefing','Media Briefing Pack — AS118',
 'BRIEFING NOTE — FOR MEDIA USE — Aurora Skylines Flight AS118: Emergency Diversion to Valencia. Key facts: Departure 08:20 MAD, diversion 09:14 en route, landed Valencia 09:28. 189 PAX + 6 crew. Medical event: passenger cardiac episode. Crew response: first aid administered by trained purser, emergency services pre-alerted. AESA case number: TBD. Company spokesperson: Head of Communications. Next update: 14:00 CET.',
 'approved','2026-05-28 11:00:00+00'),
('e1000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000001',
 'holding_statement','Holding Statement — AS118',
 'Aurora Skylines confirms an incident involving flight AS118 on 28 May 2026. The safety and wellbeing of our passengers and crew is always our first priority. We are gathering full information and will provide a further update shortly.',
 'approved','2026-05-28 09:30:00+00'),
('e1000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000001',
 'ceo_statement','CEO Statement — AS118',
 'Statement from CEO, Ana Portillo: "I am proud of the professionalism shown by our crew aboard AS118 today. Their swift response in a stressful situation reflects the highest standards of Aurora Skylines. I extend my personal wishes for the full recovery of the passenger involved. Aurora Skylines will continue to invest in crew medical training and emergency response procedures."',
 'approved','2026-05-28 14:00:00+00'),
('e1000000-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000001',
 'regulator_notification','AESA Notification — AS118',
 'CONFIDENTIAL — AESA NOTIFICATION per SERA.14095. Operator: Aurora Skylines. Flight: AS118. Date: 2026-05-28. Type: Air Safety Report — Medical Emergency Diversion. Registration: EC-MXY. Summary: Precautionary diversion VLC following PAX cardiac event. AED used. PAX transferred to Hospital La Fe Valencia. Crew: Trained First Aid Level 2. Status: Investigating. Contact: Safety@auroraskylines.com.',
 'approved','2026-05-28 12:00:00+00'),
('e1000000-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001',
 'internal_brief','Internal Brief — AS118 (Staff Only)',
 'INTERNAL: AS118 Situation Update for Aurora Skylines Staff. The crew acted correctly and followed all emergency procedures. The passenger was conscious and stable when transferred. PLEASE DO NOT speculate on social media. Direct all media enquiries to press@auroraskylines.com. Customer rebooking is being handled centrally. Expect social media volume to peak this afternoon — social team is monitoring.',
 'approved','2026-05-28 10:45:00+00'),
('e1000000-0000-0000-0000-000000000011','c1000000-0000-0000-0000-000000000001',
 'social_linkedin','LinkedIn Post — AS118',
 'Aurora Skylines would like to acknowledge the exceptional response of our cabin crew on flight AS118 today. Faced with a medical emergency at altitude, Purser Carmen Villanueva and her team administered first aid, coordinated with air traffic control, and ensured the safe diversion of the aircraft to Valencia. This is the standard we hold ourselves to every day. Our thoughts are with the passenger and their family.',
 'approved','2026-05-28 16:00:00+00'),

-- 11 assets for INC_CRITICAL_2 (viral passenger removal)
('e1000000-0000-0000-0000-000000000012','c1000000-0000-0000-0000-000000000002',
 'holding_statement','Holding Statement — AS340 Passenger Removal',
 'Aurora Skylines is aware of a video circulating on social media relating to flight AS340 on 2 June 2026. We take all such matters extremely seriously. We have launched an immediate internal investigation and are in direct contact with the passenger involved.',
 'approved','2026-06-02 15:00:00+00'),
('e1000000-0000-0000-0000-000000000013','c1000000-0000-0000-0000-000000000002',
 'press_release','Press Release — AS340 Accessibility Incident',
 'Aurora Skylines sincerely apologises to Ms. [name withheld at request] for the distressing experience she suffered aboard flight AS340 on 2 June 2026. The manner in which the situation was handled fell far short of our standards and of the dignity every passenger deserves. We are conducting a full and transparent investigation. The passenger has been contacted directly by our CEO and offered our unreserved apology and full compensation. Aurora Skylines is fully committed to EU Regulation 1107/2006 on the rights of disabled persons in air transport.',
 'approved','2026-06-03 10:00:00+00'),
('e1000000-0000-0000-0000-000000000014','c1000000-0000-0000-0000-000000000002',
 'ceo_statement','CEO Statement — Accessibility Incident',
 'Ana Portillo, CEO: "I have personally spoken to the passenger affected and I am deeply sorry for what happened. This incident does not reflect Aurora Skylines'' values or our commitment to accessible travel. The crew members involved have been suspended pending investigation. We will review all accessibility training across our network and work with disability rights organisations to do better. No passenger should ever be made to feel unwelcome on our aircraft."',
 'approved','2026-06-03 11:00:00+00'),
('e1000000-0000-0000-0000-000000000015','c1000000-0000-0000-0000-000000000002',
 'social_twitter','Twitter Response — Accessibility Incident',
 'We are deeply sorry for what happened to our passenger on AS340. This was wrong. We have suspended the staff involved, launched a full investigation, and are in direct contact with the passenger. Her dignity and rights matter. Thread 🧵👇 [1/5]',
 'approved','2026-06-03 11:15:00+00'),
('e1000000-0000-0000-0000-000000000016','c1000000-0000-0000-0000-000000000002',
 'social_instagram','Instagram Response — Accessibility Incident',
 'To the passenger on AS340 and to our community: we failed. We are sorry. Aurora Skylines is taking immediate action: staff suspended, investigation launched, mandatory accessibility retraining ordered for all cabin crew. We stand with disabled travellers and will do better.',
 'approved','2026-06-03 11:30:00+00'),
('e1000000-0000-0000-0000-000000000017','c1000000-0000-0000-0000-000000000002',
 'customer_email','Customer Email — Accessibility Commitment',
 'Dear Aurora Skylines passenger, We are writing to inform you of actions we are taking following an accessibility incident on flight AS340. Aurora Skylines is committed to the rights of all passengers, including those with disabilities. We have suspended the staff involved and launched an independent investigation. We will publish our findings publicly within 30 days. If you have ever experienced accessibility-related issues with us, please contact accessibility@auroraskylines.com.',
 'approved','2026-06-04 09:00:00+00'),
('e1000000-0000-0000-0000-000000000018','c1000000-0000-0000-0000-000000000002',
 'regulator_notification','DGAC France Response — AS340',
 'CONFIDENTIAL — FOR DGAC USE. Aurora Skylines acknowledges receipt of DGAC''s request for incident report ref. DGAC/2026/06/0234 concerning flight AS340 CDG-MAD on 2 June 2026. We commit to providing a full incident report within 72 hours per EU 376/2014. Internal investigation is underway. Crew involved have been suspended. The passenger has been contacted and compensated. Aurora Skylines Legal: legal@auroraskylines.com.',
 'approved','2026-06-03 14:00:00+00'),
('e1000000-0000-0000-0000-000000000019','c1000000-0000-0000-0000-000000000002',
 'faq','FAQ — AS340 Accessibility Incident',
 'Q: What happened on AS340? A: A passenger was removed from the aircraft in a manner we deeply regret. Q: Was this legal? A: We are investigating whether correct procedures were followed. Q: Has the passenger been compensated? A: Yes, we have been in direct contact and offered full compensation. Q: What is Aurora Skylines doing about this? A: Staff suspended, investigation launched, mandatory retraining ordered. Q: Will there be legal action? A: We are cooperating fully with DGAC and AESA.',
 'approved','2026-06-04 10:00:00+00'),
('e1000000-0000-0000-0000-000000000020','c1000000-0000-0000-0000-000000000002',
 'media_briefing','Media Briefing — AS340 Incident',
 'MEDIA BRIEFING — AURORA SKYLINES — AS340 ACCESSIBILITY INCIDENT — 4 June 2026. Key facts: Flight AS340 CDG-MAD, 2 June 2026. Incident: passenger with mobility aid removed from aircraft at CDG. Staff: two crew members suspended pending investigation. Regulatory: DGAC investigation open; AESA notified. Passenger: contacted by CEO, full compensation offered. Next steps: independent investigation, accessibility audit all crew, public report within 30 days. Spokesperson: VP Communications.',
 'approved','2026-06-04 11:00:00+00'),
('e1000000-0000-0000-0000-000000000021','c1000000-0000-0000-0000-000000000002',
 'internal_brief','Internal Brief — AS340 (Staff Only)',
 'INTERNAL: AS340 Situation. CEO has spoken to affected passenger. Two crew members suspended — HR is managing. DO NOT speak to media. DO NOT post on personal social media. Direct all enquiries to press@auroraskylines.com. Legal is aware and monitoring. We expect significant media coverage over the next 72h. All customer-facing staff: please be aware passengers may raise this topic. Be empathetic, apologise, refer to official statement.',
 'approved','2026-06-03 12:00:00+00'),
('e1000000-0000-0000-0000-000000000022','c1000000-0000-0000-0000-000000000002',
 'social_linkedin','LinkedIn Post — Accessibility Commitment',
 'Aurora Skylines is committed to being a fully accessible airline. Following the incident on flight AS340, we are taking the following immediate actions: 1) Mandatory accessibility and disability awareness retraining for all 3,200 cabin crew, 2) Partnership with the European Disability Forum to review our policies, 3) Creation of an Accessibility Advisory Board with lived-experience members, 4) Public report on our findings within 30 days. We will be better.',
 'approved','2026-06-05 09:00:00+00');


-- ─── 5. Audit Log (20 rows) ───────────────────────────────────
INSERT INTO public.incident_audit_log (
  incident_id, changed_by, field_name, old_value, new_value, changed_at
) VALUES
-- AS118 escalation history
('c1000000-0000-0000-0000-000000000001',NULL,'risk_score','0','40','2026-05-28 09:15:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'risk_score','40','65','2026-05-28 09:30:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'risk_score','65','88','2026-05-28 10:00:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'crisis_level','0','1','2026-05-28 09:15:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'crisis_level','1','2','2026-05-28 09:30:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'crisis_level','2','3','2026-05-28 10:00:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'status','active','monitoring','2026-05-28 14:00:00+00'),
('c1000000-0000-0000-0000-000000000001',NULL,'approval_status','pending','approved','2026-05-28 14:30:00+00'),
-- AS340 escalation history
('c1000000-0000-0000-0000-000000000002',NULL,'risk_score','0','50','2026-06-02 14:35:00+00'),
('c1000000-0000-0000-0000-000000000002',NULL,'risk_score','50','75','2026-06-02 15:30:00+00'),
('c1000000-0000-0000-0000-000000000002',NULL,'risk_score','75','82','2026-06-02 16:00:00+00'),
('c1000000-0000-0000-0000-000000000002',NULL,'crisis_level','0','2','2026-06-02 15:00:00+00'),
('c1000000-0000-0000-0000-000000000002',NULL,'crisis_level','2','3','2026-06-02 16:00:00+00'),
('c1000000-0000-0000-0000-000000000002',NULL,'status','active','monitoring','2026-06-03 11:00:00+00'),
-- IT Outage escalation
('c1000000-0000-0000-0000-000000000003',NULL,'risk_score','0','55','2026-05-15 07:00:00+00'),
('c1000000-0000-0000-0000-000000000003',NULL,'risk_score','55','72','2026-05-15 08:00:00+00'),
('c1000000-0000-0000-0000-000000000003',NULL,'status','active','contained','2026-05-15 10:00:00+00'),
-- Data breach
('c1000000-0000-0000-0000-000000000009',NULL,'risk_score','0','61','2026-04-01 23:50:00+00'),
('c1000000-0000-0000-0000-000000000009',NULL,'crisis_level','0','2','2026-04-02 08:00:00+00'),
('c1000000-0000-0000-0000-000000000009',NULL,'approval_status','pending','approved','2026-04-02 10:00:00+00');


-- ─── 6. Response Plans (2 rows) ──────────────────────────────
INSERT INTO public.response_plan (
  incident_id,
  phase_immediate, phase_short, phase_medium, phase_long
) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  '[
    {"order":1,"action":"Issue holding statement via all channels within 30 minutes","owner":"Communications Lead","due":"2026-05-28T09:44:00Z","status":"completed"},
    {"order":2,"action":"Notify AESA via Air Safety Report portal (SERA.14095)","owner":"Safety Manager","due":"2026-05-28T10:14:00Z","status":"completed"},
    {"order":3,"action":"Establish passenger contact — rebook all 189 PAX at no charge","owner":"Customer Experience","due":"2026-05-28T10:30:00Z","status":"completed"},
    {"order":4,"action":"Brief CEO and prepare written statement for media","owner":"Communications Lead","due":"2026-05-28T11:00:00Z","status":"completed"}
  ]',
  '[
    {"order":1,"action":"CEO personal call to affected passenger and family","owner":"CEO","due":"2026-05-29T09:14:00Z","status":"completed"},
    {"order":2,"action":"Full press release issued — confirm diversion facts, crew performance, investigation","owner":"Communications","due":"2026-05-29T10:00:00Z","status":"completed"},
    {"order":3,"action":"Crew debrief and welfare check","owner":"People & Culture","due":"2026-05-29T12:00:00Z","status":"completed"},
    {"order":4,"action":"ENAIRE coordination — review ATC communications from diversion","owner":"Safety","due":"2026-05-29T15:00:00Z","status":"in_progress"}
  ]',
  '[
    {"order":1,"action":"AESA preliminary investigation response submitted","owner":"Safety","due":"2026-05-31T17:00:00Z","status":"not_started"},
    {"order":2,"action":"Internal review of medical emergency protocols — recommendations to COO","owner":"Cabin Crew Director","due":"2026-05-31T12:00:00Z","status":"not_started"},
    {"order":3,"action":"Media follow-up — share positive crew story via LinkedIn and internal comms","owner":"Communications","due":"2026-05-30T10:00:00Z","status":"not_started"}
  ]',
  '[
    {"order":1,"action":"Publish outcome of AESA investigation when complete","owner":"Safety","due":null,"status":"not_started"},
    {"order":2,"action":"AED refresher training scheduled for all cabin crew","owner":"Training","due":null,"status":"not_started"},
    {"order":3,"action":"Case study included in annual safety review","owner":"Safety","due":null,"status":"not_started"}
  ]'
),
(
  'c1000000-0000-0000-0000-000000000002',
  '[
    {"order":1,"action":"Publish holding statement within 30 minutes of video appearing","owner":"Communications Lead","due":"2026-06-02T15:00:00Z","status":"completed"},
    {"order":2,"action":"Suspend crew involved pending investigation","owner":"HR Director","due":"2026-06-02T16:00:00Z","status":"completed"},
    {"order":3,"action":"Make direct contact with affected passenger via airport services","owner":"Customer Experience Director","due":"2026-06-02T15:30:00Z","status":"completed"},
    {"order":4,"action":"Notify DGAC France of incident (EU 376/2014)","owner":"Legal","due":"2026-06-02T17:00:00Z","status":"completed"},
    {"order":5,"action":"Social media rapid response — acknowledge, do not deflect","owner":"Social Media Manager","due":"2026-06-02T15:00:00Z","status":"completed"}
  ]',
  '[
    {"order":1,"action":"CEO public apology — written statement and video if possible","owner":"CEO + Communications","due":"2026-06-03T11:00:00Z","status":"completed"},
    {"order":2,"action":"Submit full incident report to DGAC (72h deadline)","owner":"Legal + Safety","due":"2026-06-05T14:33:00Z","status":"in_progress"},
    {"order":3,"action":"Announce mandatory accessibility retraining for all cabin crew","owner":"Cabin Crew Director","due":"2026-06-04T09:00:00Z","status":"completed"},
    {"order":4,"action":"Engage European Disability Forum for advisory input","owner":"Sustainability + Comms","due":"2026-06-04T17:00:00Z","status":"in_progress"},
    {"order":5,"action":"Establish media Q&A document and brief spokesperson","owner":"Communications","due":"2026-06-03T13:00:00Z","status":"completed"}
  ]',
  '[
    {"order":1,"action":"Publish independent investigation terms of reference","owner":"Legal + Safety","due":"2026-06-09T12:00:00Z","status":"not_started"},
    {"order":2,"action":"All cabin crew complete Disability Awareness Module 1 (online, 2h)","owner":"Training","due":"2026-06-09T18:00:00Z","status":"not_started"},
    {"order":3,"action":"AESA notification for EU territory flights","owner":"Safety","due":"2026-06-07T12:00:00Z","status":"not_started"},
    {"order":4,"action":"Comms update to passengers at 72h mark — progress report","owner":"Communications","due":"2026-06-05T14:33:00Z","status":"not_started"}
  ]',
  '[
    {"order":1,"action":"Publish public report on investigation findings (30-day commitment)","owner":"Legal + Comms","due":"2026-07-02T12:00:00Z","status":"not_started"},
    {"order":2,"action":"Announce Accessibility Advisory Board members","owner":"HR + Comms","due":"2026-07-15T09:00:00Z","status":"not_started"},
    {"order":3,"action":"Annual accessibility audit of all Aurora Skylines aircraft and procedures","owner":"Safety + Operations","due":"2026-12-31T00:00:00Z","status":"not_started"},
    {"order":4,"action":"Review and amend Conditions of Carriage — disability provisions","owner":"Legal","due":"2026-08-01T00:00:00Z","status":"not_started"}
  ]'
);


-- ─── 7. Distribution Lists (update seeds to Aurora Skylines addresses) ────────
-- Phase 3 already seeded generic placeholder emails. Update to Aurora Skylines addresses.
-- We use UPDATE rather than re-insert to avoid FK conflicts.

UPDATE public.distribution_lists SET
  name = 'Executive Team',
  emails = ARRAY[
    'ceo@auroraskylines.com',
    'coo@auroraskylines.com',
    'cfo@auroraskylines.com',
    'vp_comms@auroraskylines.com',
    'vp_legal@auroraskylines.com'
  ]
WHERE id = 'a1000000-0000-0000-0000-000000000001';

UPDATE public.distribution_lists SET
  name = 'Press & Media',
  emails = ARRAY[
    'press@auroraskylines.com',
    'mediarelations@auroraskylines.com',
    'pr_agency@comms-partner.com'
  ]
WHERE id = 'a1000000-0000-0000-0000-000000000002';

UPDATE public.distribution_lists SET
  name = 'Operations',
  emails = ARRAY[
    'ops_lead@auroraskylines.com',
    'groundops@auroraskylines.com',
    'flightops@auroraskylines.com',
    'crewing@auroraskylines.com'
  ]
WHERE id = 'a1000000-0000-0000-0000-000000000003';

UPDATE public.distribution_lists SET
  name = 'Regulators',
  emails = ARRAY[
    'safety@auroraskylines.com',
    'legal@auroraskylines.com',
    'aesa_liaison@auroraskylines.com',
    'compliance@auroraskylines.com'
  ]
WHERE id = 'a1000000-0000-0000-0000-000000000004';

UPDATE public.distribution_lists SET
  name = 'All Employees',
  emails = ARRAY[
    'allstaff@auroraskylines.com'
  ]
WHERE id = 'a1000000-0000-0000-0000-000000000005';
