-- PDT Dashboard — demo seed data
-- Run this once, after schema.sql, in the Supabase SQL editor.
-- Mirrors the demo dataset that used to live in src/lib/seed.ts.
-- All dates are relative to the moment you run this script.

-- ---------- agents ----------
insert into agents (id, name, team, username, password) values
  ('a1', 'Ann',    'Domestic',      'ann',    'pdt123'),
  ('a2', 'Jess',   'Domestic',      'jess',   'pdt123'),
  ('a3', 'Roselle','Domestic',      'roselle','pdt123'),
  ('a4', 'Ange',   'International', 'ange',   'pdt123'),
  ('a5', 'Axel',   'International', 'axel',   'pdt123'),
  ('a6', 'Pat',    'International', 'pat',    'pdt123'),
  ('a7', 'Krisha', 'International', 'krisha', 'pdt123'),
  ('a8', 'Celine', 'International', 'celine', 'pdt123')
on conflict (id) do nothing;

-- ---------- admin ----------
insert into admins (id, username, password, name) values
  ('admin', 'admin', 'admin123', 'Supervisor / Manager')
on conflict (id) do nothing;

-- ---------- tasks ----------
insert into records (id, collection, agent_id, title, category, status, priority, progress,
  estimated_hours, started_at, completed_at, start_date, due_date, items_total, items_error,
  special, target, requirements, remarks, description, links, comments, activity) values
('t1','tasks','a1','Homepage banner update','Website','published','medium',100,
  4, now() - interval '1 day', now() - interval '1 day' + interval '3.2 hours', now() - interval '2 days', now(),
  3, 0, false, '3 banners', 'Final brand assets, copy from marketing', 'Published ahead of schedule', null, '[]','[]','[]'),
('t2','tasks','a1','Lakbayhub tour listing','Lakbayhub','published','medium',100,
  6, now() - interval '2 days', now() - interval '2 days' + interval '5.5 hours', now() - interval '3 days', now() - interval '1 day',
  8, 1, false, '8 listings', 'Tour photos, pricing sheet', '1 listing needed a price fix', null, '[]','[]','[]'),
('t3','tasks','a1','Collectives holiday bundle','Collectives','in_progress','high',45,
  5, now() - interval '5 hours', null, now(), now() + interval '3 days',
  0, 0, false, '4 bundles', 'Bundle SKUs, banner art', 'Waiting for 2 product images',
  'Build the 4 holiday collective bundles for the December push. Pull SKUs from the product sheet, set inventory caps, and request banner art from design.',
  '[{"id":"lk1","label":"Product sheet","url":"https://example.com/holiday-skus"},{"id":"lk2","label":"Design brief","url":"https://example.com/brief"}]',
  '[{"id":"cm0","by":"Supervisor","role":"admin","text":"Prioritize this — marketing wants it live by Friday.","ts":0}]',
  '[{"id":"ac0","type":"status","text":"Status → In Progress","by":"Ann","role":"agent","ts":0}]'),
('t4','tasks','a2','Booking bot flow fix','BOT','published','medium',100,
  8, now() - interval '1 day', now() - interval '1 day' + interval '6.5 hours', now() - interval '2 days', now(),
  12, 0, false, '12 flows', 'Updated fare rules', 'QA passed', null, '[]','[]','[]'),
('t5','tasks','a2','Cebu land arrangement','Land arrangement','revisions','medium',75,
  5, now() - interval '3 days', now() - interval '3 days' + interval '6.2 hours', now() - interval '4 days', now() - interval '2 days',
  6, 2, false, '6 packages', 'Supplier rates, transfer schedule', 'Sent back: 2 transfer times wrong', null, '[]','[]','[]'),
('t6','tasks','a2','RUSH: Festival landing page','Website','for_review','high',90,
  3, null, null, now() + interval '1 day', now() + interval '2 days',
  0, 0, true, '1 page', 'Hero copy + event schedule', 'Priority — due Friday', 'Single landing page for the summer festival promo.', '[]','[]','[]'),
('t7','tasks','a3','Lakbayhub package upload','Lakbayhub','published','medium',100,
  4, now() - interval '2 days', now() - interval '2 days' + interval '3.5 hours', now() - interval '3 days', now() - interval '1 day',
  10, 0, false, '10 packages', 'Package CSV', 'All live', null, '[]','[]','[]'),
('t8','tasks','a3','Collectives page revamp','Collectives','pending','medium',0,
  6, null, null, now() + interval '2 days', now() + interval '6 days',
  0, 0, false, '3 sections', 'New layout from design', '', null, '[]','[]','[]'),
('t9','tasks','a4','Multi-city bot logic','BOT','published','medium',100,
  10, now() - interval '1 day', now() - interval '1 day' + interval '8.5 hours', now() - interval '2 days', now(),
  15, 1, false, '15 routes', 'Route matrix', '1 route flagged for review', null, '[]','[]','[]'),
('t10','tasks','a4','Boracay ground transfers','Land arrangement','published','medium',100,
  6, now() - interval '2 days', now() - interval '2 days' + interval '5 hours', now() - interval '3 days', now() - interval '1 day',
  9, 0, false, '9 transfers', 'Vendor contracts', 'Done', null, '[]','[]','[]'),
('t11','tasks','a4','Old promo microsite','Website','canceled','medium',0,
  4, null, null, now() - interval '4 days', now() - interval '1 day',
  0, 0, false, '1 site', '—', 'Promo canceled by management', null, '[]','[]','[]'),
('t12','tasks','a5','Intl landing redesign','Website','revisions','medium',75,
  8, now() - interval '2 days', now() - interval '2 days' + interval '9.5 hours', now() - interval '3 days', now() - interval '1 day',
  5, 1, false, '5 pages', 'Locale copy (EN/JP)', 'Revisions: JP copy under review', null, '[]','[]','[]'),
('t13','tasks','a5','SPECIAL: Visa-assist bot','BOT','in_progress','high',55,
  12, now() - interval '9 hours', null, now() - interval '1 day', now() + interval '4 days',
  0, 0, true, '1 module', 'Visa rules per country', 'Priority build', null, '[]','[]','[]'),
('t14','tasks','a6','Lakbayhub intl listings','Lakbayhub','published','medium',100,
  5, now() - interval '1 day', now() - interval '1 day' + interval '4 hours', now() - interval '2 days', now(),
  14, 0, false, '14 listings', 'Listing data + photos', 'All published', null, '[]','[]','[]'),
('t15','tasks','a6','Bangkok land arrangement','Land arrangement','published','medium',100,
  6, now() - interval '3 days', now() - interval '3 days' + interval '5.8 hours', now() - interval '4 days', now() - interval '2 days',
  7, 0, false, '7 packages', 'Supplier rates', '', null, '[]','[]','[]'),
('t16','tasks','a6','Collectives Q3 bundle','Collectives','pending','medium',0,
  5, null, null, now() + interval '1 day', now() + interval '5 days',
  0, 0, false, '5 bundles', 'Q3 product list', '', null, '[]','[]','[]'),
('t17','tasks','a7','Tokyo collectives setup','Collectives','published','medium',100,
  7, now() - interval '1 day', now() - interval '1 day' + interval '6 hours', now() - interval '2 days', now(),
  8, 1, false, '8 bundles', 'Tokyo inventory', '1 bundle re-checked', null, '[]','[]','[]'),
('t18','tasks','a7','Intl homepage banner','Website','published','medium',100,
  4, now() - interval '2 days', now() - interval '2 days' + interval '3 hours', now() - interval '3 days', now() - interval '1 day',
  4, 0, false, '4 banners', 'Seasonal art', 'Live', null, '[]','[]','[]'),
('t19','tasks','a7','Booking bot QA pass','BOT','in_progress','medium',50,
  6, now() - interval '3 hours', null, now() - interval '1 day', now() + interval '1 day',
  0, 0, false, '20 cases', 'Test scripts', 'Halfway through cases', null, '[]','[]','[]')
on conflict (id) do nothing;

-- ---------- premium ----------
insert into records (id, collection, agent_id, team, title, category, priority, status, progress,
  start_date, due_date, destination, description, remarks, assigned_by, completed_by, updated_at, updated_by) values
('pm1','premium','a1','Domestic','POTW: Boracay Premium Escape','Collectives','high','in_progress',60,
  now() - interval '3 days', now() + interval '4 days', 'Boracay',
  'Flagship Product-of-the-Week premium package: 3D2N Boracay with curated inclusions.', 'Awaiting final resort contract.',
  'Supervisor', null, now() - interval '6 hours', 'Ann'),
('pm2','premium','a3','Domestic','POTW: Palawan Island Collective','Lakbayhub','medium','for_review',85,
  now() - interval '5 days', now() + interval '2 days', 'Palawan',
  'El Nido + Coron premium island-hopping collective.', null,
  'Supervisor', null, now() - interval '6 hours', 'Roselle'),
('pm3','premium','a5','International','POTW: Tokyo City Premium','Land arrangement','high','completed',100,
  now() - interval '12 days', now() - interval '4 days', 'Tokyo',
  null, 'Published, strong early bookings.',
  'Supervisor', 'Axel', now() - interval '6 hours', 'Axel'),
('pm4','premium','a6','International','POTW: Bangkok Weekender','Website','low','pending',0,
  now() + interval '1 day', now() + interval '8 days', 'Bangkok',
  null, null,
  'Supervisor', null, now() - interval '6 hours', 'Pat')
on conflict (id) do nothing;
update records set completed_at = now() - interval '1 day' where id = 'pm3';

-- ---------- gladex ----------
insert into records (id, collection, agent_id, team, title, department, priority, status, progress,
  start_date, due_date, description, remarks, assigned_by, completed_by, updated_at, updated_by) values
('gl1','gladex','a4','International','GLADEX CRM migration','Tech','high','in_progress',40,
  now() - interval '6 days', now() + interval '6 days',
  'Migrate operator records into the new GLADEX CRM module.', null,
  'Supervisor', null, now() - interval '6 hours', 'Ange'),
('gl2','gladex','a2','Domestic','GLADEX supplier audit Q3','Operations','medium','for_review',80,
  now() - interval '8 days', now() + interval '1 day',
  'Quarterly audit of land-arrangement suppliers.', null,
  'Supervisor', null, now() - interval '6 hours', 'Jess'),
('gl3','gladex','a7','International','GLADEX rate-card refresh','Finance','medium','completed',100,
  now() - interval '15 days', now() - interval '5 days',
  null, 'Approved by finance.',
  'Supervisor', 'Krisha', now() - interval '6 hours', 'Krisha'),
('gl4','gladex','a1','Domestic','GLADEX onboarding deck','Marketing','low','pending',0,
  now() + interval '2 days', now() + interval '10 days',
  null, null,
  'Supervisor', null, now() - interval '6 hours', 'Ann')
on conflict (id) do nothing;
update records set completed_at = now() - interval '1 day' where id = 'gl3';

-- ---------- tariff ----------
insert into records (id, collection, agent_id, team, title, category, destination, priority, status, progress,
  start_date, due_date, description, remarks, assigned_by, completed_by, updated_at, updated_by) values
('tf1','tariff','a1','Domestic','Boracay_Tariff_2026.xlsx','Land arrangement','Boracay','high','in_progress',50,
  now(), now() + interval '1 day',
  'Daily tariff update — resort + transfer rates.', 'Updated AM rates, awaiting PM ferry rates.',
  'Supervisor', null, now() - interval '6 hours', 'Ann'),
('tf2','tariff','a2','Domestic','Cebu_Tariff_2026.xlsx','Land arrangement','Cebu','medium','completed',100,
  now() - interval '1 day', now(),
  null, 'Submitted on time.',
  'Supervisor', 'Jess', now() - interval '6 hours', 'Jess'),
('tf3','tariff','a5','International','Tokyo_Tariff_2026.xlsx','Land arrangement','Tokyo','high','for_review',90,
  now(), now() + interval '1 day',
  'JP supplier rate sheet.', null,
  'Supervisor', null, now() - interval '6 hours', 'Axel'),
('tf4','tariff','a6','International','Bangkok_Tariff_2026.xlsx','Land arrangement','Bangkok','medium','pending',0,
  now() + interval '1 day', now() + interval '2 days',
  null, null,
  'Supervisor', null, now() - interval '6 hours', 'Pat'),
('tf5','tariff','a3','Domestic','Palawan_Tariff_2026.xlsx','Land arrangement','Palawan','low','in_progress',30,
  now(), now() + interval '2 days',
  null, null,
  'Supervisor', null, now() - interval '6 hours', 'Roselle')
on conflict (id) do nothing;
update records set completed_at = now() - interval '1 day' where id = 'tf2';

-- ---------- logs ----------
insert into logs (id, user_id, name, role, type, detail, ts) values
  ('l1', 'admin', 'Supervisor', 'admin', 'login', 'Signed in', now() - interval '4 hours'),
  ('l2', 'a4',    'Ange',       'agent', 'login', 'Signed in', now() - interval '9 hours')
on conflict (id) do nothing;

-- ---------- KPI definitions (staff_id = KPI_STAFF slug, see src/lib/constants.ts) ----------
insert into kpi_defs (id, staff_id, task, target) values
  ('k1','angelee','Land Arrangement Destinations',4),
  ('k2','angelee','New Packages',4),
  ('k3','angelee','New Optional Tours',8),
  ('k4','angelee','New Operators',4),
  ('k5','angelee','Tariff Updates',25),
  ('k6','patty','New Collective Destinations',15),
  ('k7','patty','New Promos & FAM Tours',5),
  ('k8','patty','New Operators',3),
  ('k9','krisha','New Collective Destinations',15),
  ('k10','krisha','Tariff Uploads',25),
  ('k11','krisha','New Operators',3),
  ('k12','celine','Botcake Updates',50),
  ('k13','celine','LBH Package Rate Updates',25),
  ('k14','roselle','New Destinations',2),
  ('k15','roselle','New Packages',4),
  ('k16','roselle','New Optional Tours',4),
  ('k17','roselle','New Operators',2),
  ('k18','jessy','Botcake New Packages',9),
  ('k19','jessy','OTA New Packages',9),
  ('k20','jessy','LBH Package Updates',10),
  ('k21','anne','Website Updates',10),
  ('k22','anne','Botcake Updates',50),
  ('k23','anne','LBH Updates',5)
on conflict (id) do nothing;

-- ---------- KPI progress for the current month ----------
insert into kpi_progress (month, def_id, current) values
  (to_char(now(), 'YYYY-MM'), 'k1', 3),
  (to_char(now(), 'YYYY-MM'), 'k2', 4),
  (to_char(now(), 'YYYY-MM'), 'k3', 6),
  (to_char(now(), 'YYYY-MM'), 'k4', 2),
  (to_char(now(), 'YYYY-MM'), 'k5', 20),
  (to_char(now(), 'YYYY-MM'), 'k6', 12),
  (to_char(now(), 'YYYY-MM'), 'k7', 3),
  (to_char(now(), 'YYYY-MM'), 'k8', 3),
  (to_char(now(), 'YYYY-MM'), 'k9', 15),
  (to_char(now(), 'YYYY-MM'), 'k10', 18),
  (to_char(now(), 'YYYY-MM'), 'k11', 2),
  (to_char(now(), 'YYYY-MM'), 'k12', 45),
  (to_char(now(), 'YYYY-MM'), 'k13', 25),
  (to_char(now(), 'YYYY-MM'), 'k14', 2),
  (to_char(now(), 'YYYY-MM'), 'k15', 3),
  (to_char(now(), 'YYYY-MM'), 'k16', 4),
  (to_char(now(), 'YYYY-MM'), 'k17', 1),
  (to_char(now(), 'YYYY-MM'), 'k18', 8),
  (to_char(now(), 'YYYY-MM'), 'k19', 9),
  (to_char(now(), 'YYYY-MM'), 'k20', 7),
  (to_char(now(), 'YYYY-MM'), 'k21', 10),
  (to_char(now(), 'YYYY-MM'), 'k22', 30),
  (to_char(now(), 'YYYY-MM'), 'k23', 4)
on conflict (month, def_id) do nothing;
