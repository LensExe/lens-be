-- Customer-only seed for the supplied email list.
-- In this schema a customer role is represented by a row in `customers`.
-- Keycloak provisioning is intentionally not included in this seed.

BEGIN;

INSERT INTO users (id, keycloak_id, fullname, email, status)
SELECT seed.id::uuid, seed.keycloak_id, seed.fullname, seed.email, seed.status
FROM (
  VALUES
  ('e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001', 'anhdonguyennhi', 'anhdonguyennhi@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002', 'bvmldung53', 'bvmldung53@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000003', 'e2000000-0000-4000-8000-000000000003', 'codeforceskiet', 'codeforceskiet@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000004', 'e2000000-0000-4000-8000-000000000004', 'dunghvse180204', 'dunghvse180204@fpt.edu.vn', 'active'),
  ('e1000000-0000-4000-8000-000000000005', 'e2000000-0000-4000-8000-000000000005', 'giahanguyenluong', 'giahanguyenluong@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000006', 'e2000000-0000-4000-8000-000000000006', 'hieu.do1104', 'hieu.do1104@hcmut.edu.vn', 'active'),
  ('e1000000-0000-4000-8000-000000000007', 'e2000000-0000-4000-8000-000000000007', 'miczone123', 'miczone123@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000008', 'e2000000-0000-4000-8000-000000000008', 'mintam0101', 'mintam0101@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000009', 'e2000000-0000-4000-8000-000000000009', 'ndmanh1005', 'ndmanh1005@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000010', 'e2000000-0000-4000-8000-000000000010', 'nghiavyo1308', 'nghiavyo1308@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000011', 'e2000000-0000-4000-8000-000000000011', 'nhatruong5020', 'nhatruong5020@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000012', 'e2000000-0000-4000-8000-000000000012', 'nhiv5313', 'nhiv5313@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000013', 'e2000000-0000-4000-8000-000000000013', 'thinhindo', 'thinhindo@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000014', 'e2000000-0000-4000-8000-000000000014', 'vuquocviet205', 'vuquocviet205@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000015', 'e2000000-0000-4000-8000-000000000015', 'nguyenduongthuan75321', 'nguyenduongthuan75321@gmail.com', 'active'),
  ('e1000000-0000-4000-8000-000000000016', 'e2000000-0000-4000-8000-000000000016', 'hoangdungvn24', 'hoangdungvn24@gmail.com', 'active')
) AS seed(id, keycloak_id, fullname, email, status)
WHERE NOT EXISTS (
  SELECT 1 FROM users existing WHERE lower(existing.email) = lower(seed.email)
)
ON CONFLICT DO NOTHING;

INSERT INTO customers (id, user_id, preferred_styles, location)
SELECT seed.customer_id, users.id, '[]'::jsonb, NULL
FROM (
  VALUES
    ('e3000000-0000-4000-8000-000000000001'::uuid, 'anhdonguyennhi@gmail.com'),
    ('e3000000-0000-4000-8000-000000000002'::uuid, 'bvmldung53@gmail.com'),
    ('e3000000-0000-4000-8000-000000000003'::uuid, 'codeforceskiet@gmail.com'),
    ('e3000000-0000-4000-8000-000000000004'::uuid, 'dunghvse180204@fpt.edu.vn'),
    ('e3000000-0000-4000-8000-000000000005'::uuid, 'giahanguyenluong@gmail.com'),
    ('e3000000-0000-4000-8000-000000000006'::uuid, 'hieu.do1104@hcmut.edu.vn'),
    ('e3000000-0000-4000-8000-000000000007'::uuid, 'miczone123@gmail.com'),
    ('e3000000-0000-4000-8000-000000000008'::uuid, 'mintam0101@gmail.com'),
    ('e3000000-0000-4000-8000-000000000009'::uuid, 'ndmanh1005@gmail.com'),
    ('e3000000-0000-4000-8000-000000000010'::uuid, 'nghiavyo1308@gmail.com'),
    ('e3000000-0000-4000-8000-000000000011'::uuid, 'nhatruong5020@gmail.com'),
    ('e3000000-0000-4000-8000-000000000012'::uuid, 'nhiv5313@gmail.com'),
    ('e3000000-0000-4000-8000-000000000013'::uuid, 'thinhindo@gmail.com'),
    ('e3000000-0000-4000-8000-000000000014'::uuid, 'vuquocviet205@gmail.com'),
    ('e3000000-0000-4000-8000-000000000015'::uuid, 'nguyenduongthuan75321@gmail.com'),
    ('e3000000-0000-4000-8000-000000000016'::uuid, 'hoangdungvn24@gmail.com')
) AS seed(customer_id, email)
JOIN LATERAL (
  SELECT users.id
  FROM users
  WHERE lower(users.email) = lower(seed.email)
  ORDER BY users.id::text LIKE 'e1000000-0000-4000-8000-%', users.id
  LIMIT 1
) users ON true
ON CONFLICT DO NOTHING;

INSERT INTO wallets (user_id)
SELECT customer.user_id
FROM customers customer
JOIN users account ON account.id = customer.user_id
WHERE lower(account.email) = ANY(ARRAY[
  'anhdonguyennhi@gmail.com',
  'bvmldung53@gmail.com',
  'codeforceskiet@gmail.com',
  'dunghvse180204@fpt.edu.vn',
  'giahanguyenluong@gmail.com',
  'hieu.do1104@hcmut.edu.vn',
  'hoangdungvn24@gmail.com',
  'miczone123@gmail.com',
  'mintam0101@gmail.com',
  'ndmanh1005@gmail.com',
  'nghiavyo1308@gmail.com',
  'nguyenduongthuan75321@gmail.com',
  'nhatruong5020@gmail.com',
  'nhiv5313@gmail.com',
  'thinhindo@gmail.com',
  'vuquocviet205@gmail.com'
])
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
