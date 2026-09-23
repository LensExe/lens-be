-- Baseline for a NEW database. Review docs/database-decisions.md first.
CREATE TABLE users (
    id uuid PRIMARY KEY, 
    keycloak_id text NOT NULL UNIQUE,
    fullname text NOT NULL,
    email text NOT NULL,
    phone_number text,
    avatar_url text,
    gender text,
    dob date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned','inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL UNIQUE REFERENCES users(id), 
    preferred_styles jsonb NOT NULL DEFAULT '[]',
    location text, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admins (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL UNIQUE REFERENCES users(id), 
    is_active boolean NOT NULL DEFAULT true, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE photographers (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL UNIQUE REFERENCES users(id), 
    tax_code text, 
    styles jsonb NOT NULL DEFAULT '[]',
    started_career_at integer,
    description text NOT NULL DEFAULT '',
    is_verified boolean NOT NULL DEFAULT false, 
    verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('unverified','pending','verified','rejected')),
    approved_by uuid REFERENCES admins(id), 
    location text NOT NULL DEFAULT '', 
    is_available boolean NOT NULL DEFAULT true, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE photographer_ratings (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id), 
    average_rating numeric NOT NULL DEFAULT 0, 
    total_feedbacks integer NOT NULL DEFAULT 0, 
    total_bookings integer NOT NULL DEFAULT 0, 
    return_customers integer NOT NULL DEFAULT 0, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE booking_plans (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id),
    name text NOT NULL, 
    description text, 
    price bigint NOT NULL CHECK(price BETWEEN 1 AND 9000000000000), 
    duration_minutes integer NOT NULL DEFAULT 60,
    photo_count integer NOT NULL DEFAULT 20,
    retouched_photo_count integer NOT NULL DEFAULT 5,
    features jsonb NOT NULL DEFAULT '[]',
    is_active boolean NOT NULL DEFAULT true, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE photographer_plans (
    id uuid PRIMARY KEY, 
    code text NOT NULL UNIQUE, 
    name text NOT NULL, 
    description text, 
    price bigint NOT NULL CHECK(price BETWEEN 1 AND 9000000000000), 
    is_active boolean NOT NULL DEFAULT true, 
    billing_cycle integer NOT NULL CHECK(billing_cycle BETWEEN 1 AND 366), 
    features jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id),
    plan_id uuid NOT NULL REFERENCES photographer_plans(id), 
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','expired','cancelled')),
    auto_renew boolean NOT NULL DEFAULT true, 
    price bigint NOT NULL CHECK(price BETWEEN 1 AND 9000000000000), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscriptions_one_live 
    ON subscriptions(photographer_id)
    WHERE status IN ('pending','active');

CREATE TABLE offline_slots (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    date date NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(photographer_id,date)
);

CREATE TABLE bookings (
    id uuid PRIMARY KEY, 
    customer_id uuid NOT NULL REFERENCES customers(id), 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    booking_plan_id uuid NOT NULL REFERENCES booking_plans(id),
    location text NOT NULL, 
    "from" timestamptz NOT NULL, 
    "to" timestamptz NOT NULL, 
    deposit_amount bigint NOT NULL CHECK(deposit_amount >= 0), 
    total_amount bigint NOT NULL CHECK(total_amount BETWEEN 1 AND 9000000000000), 
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled','in_progress','shot','completed')), 
    gallery_published_at timestamptz, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    CHECK("from" < "to"), 
    CHECK(deposit_amount <= total_amount)
);

CREATE INDEX bookings_calendar 
    ON bookings(photographer_id,"from","to");

CREATE TABLE wallets (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL UNIQUE REFERENCES users(id), 
    balance bigint NOT NULL DEFAULT 0 CHECK(balance >= 0), 
    frozen_balance bigint NOT NULL DEFAULT 0 CHECK(frozen_balance >= 0), 
    created_at timestamptz NOT NULL DEFAULT now(), 
        updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE payment_order_code 
    START 100000;

CREATE TABLE transactions (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id), 
    transaction_code text NOT NULL UNIQUE, 
    type text NOT NULL CHECK(type IN ('deposit','remaining','subscription')), 
    reference_id uuid NOT NULL, 
    direction text NOT NULL DEFAULT 'in', 
    amount bigint NOT NULL CHECK(amount BETWEEN 1 AND 9000000000000), 
    currency text NOT NULL DEFAULT 'VND' CHECK(currency = 'VND'),
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')), 
    payment_gateway text NOT NULL DEFAULT 'payos', 
    provider_order_code bigint NOT NULL DEFAULT nextval('payment_order_code') UNIQUE, 
    checkout_url text, 
    qr_code text, 
    idempotency_key text NOT NULL, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(user_id,idempotency_key), 
    UNIQUE(reference_id,type)
);

CREATE TABLE payment_webhooks (
    id uuid PRIMARY KEY, 
    provider text NOT NULL, 
    reference text NOT NULL, 
    transaction_id uuid NOT NULL REFERENCES transactions(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(provider,reference)
);

CREATE TABLE refund_requests (
    id uuid PRIMARY KEY, 
    transaction_id uuid NOT NULL REFERENCES transactions(id), 
    user_id uuid NOT NULL REFERENCES users(id), 
    amount bigint NOT NULL CHECK(amount > 0), 
    reason text NOT NULL, 
    status text NOT NULL DEFAULT 'requested', 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id), 
    file_key text NOT NULL UNIQUE, 
    file_size bigint NOT NULL CHECK(file_size BETWEEN 1 AND 104857600), 
    content_type text NOT NULL, 
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','deleted')), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portfolios (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    name text NOT NULL, 
    category text,
    description text NOT NULL DEFAULT '', 
    cover_media_id uuid REFERENCES media(id), 
    items jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE booking_deliveries (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL REFERENCES bookings(id), 
    title text NOT NULL DEFAULT 'Bàn giao ảnh',
    media_ids jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(booking_id)
);

CREATE TABLE feedbacks (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id), 
    customer_id uuid NOT NULL REFERENCES customers(id), 
    rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), 
    punctuality_rating integer NOT NULL CHECK(punctuality_rating BETWEEN 1 AND 5), 
    attitude_rating integer NOT NULL CHECK(attitude_rating BETWEEN 1 AND 5), 
    comment text NOT NULL DEFAULT '', 
    is_edited boolean NOT NULL DEFAULT false, 
    is_visible boolean NOT NULL DEFAULT true, 
    photographer_reply text,
    replied_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reports (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id), 
    target_type text NOT NULL CHECK(target_type IN ('user','booking','photographer','portfolio','feedback')),
    target_id uuid NOT NULL, 
    reason text NOT NULL, 
    evidence_media_ids jsonb NOT NULL DEFAULT '[]',
    status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','rejected','escalated')), 
    resolution text, 
    resolved_by uuid REFERENCES users(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
    id uuid PRIMARY KEY, 
    topic text NOT NULL, 
    recipient_ids jsonb NOT NULL, 
    payload jsonb NOT NULL, 
    processed_at timestamptz, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending 
    ON outbox_events(created_at) 
    WHERE processed_at IS NULL;
