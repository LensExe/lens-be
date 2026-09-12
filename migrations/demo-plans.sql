-- Optional demo catalog; review before executing. No users or financial transactions.
INSERT INTO booking_plans(id,code,name,description,price)
VALUES ('10000000-0000-4000-8000-000000000001','PORTRAIT_DEMO','Portrait demo','Demo booking plan',1000000)
ON CONFLICT (code) DO NOTHING;
INSERT INTO photographer_plans(id,code,name,description,price,billing_cycle)
VALUES ('10000000-0000-4000-8000-000000000002','VIP_DEMO','VIP demo','Demo prepaid 30-day plan',99000,30)
ON CONFLICT (code) DO NOTHING;
