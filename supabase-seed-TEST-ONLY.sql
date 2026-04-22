-- =====================================================
-- TEST SEED DATA — DELETE AFTER VERIFYING THE APP WORKS
-- Run in Supabase SQL Editor AFTER running supabase-schema.sql
-- To delete all test data: DELETE FROM shifts; DELETE FROM employees;
-- =====================================================

insert into public.employees (name, email, password_hash, role, hourly_wage, is_active, id_number, phone, bank_number, bank_branch, bank_account, created_at) values
-- Managers (password: password123)
('נועם שוחט',        'noam@gmail.com',               'password123', 'manager',  45, true, '312445678', '050-1234567', '12', '045', '123456789',  '2024-01-01T00:00:00Z'),
('גלעד שרייבר',      'gilad@gmail.com',              'password123', 'manager',  45, true, '203871542', '052-9876543', '20', '610', '987654321',  '2024-01-01T00:00:00Z'),
-- Employees (45 ₪/hr)
('ענבר פריד',        'inbar.farid@baroque.com',      null, 'employee', 45, true, '319284756', '054-3344556', '10', '148', '234567890',  '2024-01-01T00:00:00Z'),
('אורי צ''יבוטרו',   'uri.chibutro@baroque.com',     null, 'employee', 45, true, '208734512', '053-7654321', '11', '022', '345678901',  '2024-01-01T00:00:00Z'),
('שחר גרוסמן',       'shahar.grossman@baroque.com',  null, 'employee', 45, true, '315678234', '058-2233445', '12', '701', '456789012',  '2024-01-01T00:00:00Z'),
('ליאב פנחס',        'liav.pinchas@baroque.com',     null, 'employee', 45, true, '204512378', '050-5544332', '04', '333', '567890123',  '2024-01-01T00:00:00Z'),
('סופיה קפלן',       'sofia.kaplan@baroque.com',     null, 'employee', 45, true, '311234567', '052-6677889', '20', '580', '678901234',  '2024-01-01T00:00:00Z'),
('רפאל בוזגלו',      'rafael.buzaglo@baroque.com',   null, 'employee', 45, true, '206543219', '054-9988776', '17', '056', '789012345',  '2024-01-01T00:00:00Z'),
('סיני יופה',        'sinai.yoffe@baroque.com',      null, 'employee', 45, true, '318765432', '053-1122334', '10', '920', '890123456',  '2024-01-01T00:00:00Z'),
('נעה פריילפרט',     'nea.freilpert@baroque.com',    null, 'employee', 45, true, '302918374', '058-4455667', '11', '475', '901234567',  '2024-01-01T00:00:00Z'),
-- Employees (40 ₪/hr)
('אריאל רופמן',      'ariel.rofman@baroque.com',     null, 'employee', 40, true, '214365870', '050-8877665', '12', '234', '112233445',  '2024-01-01T00:00:00Z'),
('ג''וליה אבו קאליל','julia.abukhalil@baroque.com',  null, 'employee', 40, true, '328761094', '052-3344556', '20', '099', '223344556',  '2024-01-01T00:00:00Z'),
('אילה אביבי',       'ila.avivi@baroque.com',        null, 'employee', 40, true, '209183746', '054-5566778', '04', '712', '334455667',  '2024-01-01T00:00:00Z'),
('חיים זוננפלד',     'haim.sonnenfeld@baroque.com',  null, 'employee', 40, true, '316254780', '053-6677889', '17', '381', '445566778',  '2024-01-01T00:00:00Z'),
('נועה טולדו',       'noa.toledo@baroque.com',       null, 'employee', 40, true, '301827465', '058-7788990', '10', '543', '556677889',  '2024-01-01T00:00:00Z'),
('דפנה בן ארי',      'dafna.benari@baroque.com',     null, 'employee', 40, true, '217364850', '050-2233441', '11', '820', '667788990',  '2024-01-01T00:00:00Z'),
('יותם זך',          'yotam.zak@baroque.com',        null, 'employee', 40, true, '325619483', '052-1122338', '12', '067', '778899001',  '2024-01-01T00:00:00Z');

-- =====================================================
-- A few test shifts so you can verify salary calculations
-- =====================================================

insert into public.shifts (employee_id, date, type, start_time, end_time, tips, submitted_at)
select id, '2026-04-20', 'regular', '08:00', '16:00', 80, now()
from public.employees where email = 'liav.pinchas@baroque.com';

insert into public.shifts (employee_id, date, type, start_time, end_time, tips, submitted_at)
select id, '2026-04-20', 'regular', '12:00', '20:00', 0, now()
from public.employees where email = 'sinai.yoffe@baroque.com';

insert into public.shifts (employee_id, date, type, start_time, end_time, tips, submitted_at)
select id, '2026-04-19', 'regular', '08:00', '16:00', 0, now()
from public.employees where email = 'sofia.kaplan@baroque.com';

-- =====================================================
-- TO WIPE ALL TEST DATA WHEN DONE:
-- DELETE FROM public.shifts;
-- DELETE FROM public.employees;
-- =====================================================
