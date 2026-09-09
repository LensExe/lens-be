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
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL UNIQUE REFERENCES users(id), 
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
    experience integer NOT NULL DEFAULT 0 CHECK(experience >= 0), 
    is_verified boolean NOT NULL DEFAULT false, 
    approved_by uuid REFERENCES admins(id), 
    location text NOT NULL DEFAULT '', 
    is_available boolean NOT NULL DEFAULT true, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    id uuid PRIMARY KEY,
    photographer_id uuid NOT NULL UNIQUE REFERENCES photographers(id),
    images jsonb NOT NULL DEFAULT '[]', 
    description text NOT NULL DEFAULT '', 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ratings (
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
    code text NOT NULL UNIQUE, 
    name text NOT NULL, 
    description text, 
    price bigint NOT NULL CHECK(price BETWEEN 1 AND 9000000000000), 
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
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE features (
    id uuid PRIMARY KEY, 
    plan_id uuid REFERENCES booking_plans(id), 
    photographer_plan_id uuid REFERENCES photographer_plans(id), 
    code text NOT NULL, 
    name text NOT NULL, 
    value text NOT NULL, 
    is_active boolean NOT NULL DEFAULT true, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    CHECK ((plan_id IS NULL) <> (photographer_plan_id IS NULL))
);

CREATE TABLE subscriptions (
    id uuid PRIMARY KEY, 
    photographer_id uuid REFERENCES photographers(id), 
    user_id uuid NOT NULL REFERENCES users(id), 
    plan_id uuid NOT NULL REFERENCES photographer_plans(id), 
    expired_in timestamptz, 
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','expired')), 
    auto_renew boolean NOT NULL DEFAULT true, 
    price bigint NOT NULL CHECK(price BETWEEN 1 AND 9000000000000), 
    billing_cycle integer NOT NULL CHECK(billing_cycle BETWEEN 1 AND 366), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscriptions_one_live 
    ON subscriptions(user_id) 
    WHERE status IN ('pending','active');

CREATE TABLE working_slots (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    day integer NOT NULL CHECK(day BETWEEN 1 AND 7), 
    date date NOT NULL, 
    "from" timestamptz NOT NULL, 
    "to" timestamptz NOT NULL, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    CHECK("from" < "to")
);

CREATE TABLE offline_slots (
    id uuid PRIMARY KEY, 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    "from" timestamptz NOT NULL, 
    "to" timestamptz NOT NULL, 
    day integer NOT NULL CHECK(day BETWEEN 1 AND 7), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    CHECK("from" < "to")
);

CREATE TABLE bookings (
    id uuid PRIMARY KEY, 
    customer_id uuid NOT NULL REFERENCES customers(id), 
    photographer_id uuid NOT NULL REFERENCES photographers(id), 
    plan_id uuid NOT NULL REFERENCES booking_plans(id), 
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
    concurrency text NOT NULL DEFAULT 'VND' CHECK(concurrency = 'VND'), 
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
    description text NOT NULL DEFAULT '', 
    cover_media_id uuid REFERENCES media(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portfolio_items (
    id uuid PRIMARY KEY, 
    portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE, 
    media_id uuid NOT NULL REFERENCES media(id), 
    position integer NOT NULL CHECK(position >= 0), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(portfolio_id,media_id)
);

CREATE TABLE booking_deliveries (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL REFERENCES bookings(id), 
    media_id uuid NOT NULL REFERENCES media(id), 
    file_key text NOT NULL, 
    file_size bigint NOT NULL, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(booking_id,media_id)
);

CREATE TABLE galleries (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
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
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE replies (
    id uuid PRIMARY KEY, 
    feedback_id uuid NOT NULL REFERENCES feedbacks(id), 
    comment text NOT NULL, 
    is_visible boolean NOT NULL DEFAULT true, 
    is_edited boolean NOT NULL DEFAULT false, 
    replied_by uuid NOT NULL REFERENCES users(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id),
    token text NOT NULL UNIQUE, 
    platform text NOT NULL CHECK(platform IN ('ios','android','web')), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE booking_timeline (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL REFERENCES bookings(id), 
    actor_id uuid NOT NULL REFERENCES users(id), 
    status text NOT NULL, 
    reason text, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL REFERENCES bookings(id), 
    user_id uuid NOT NULL REFERENCES users(id), 
    reason text NOT NULL, 
    status text NOT NULL DEFAULT 'open', 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE location_sessions (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id), 
    active boolean NOT NULL DEFAULT true, 
    latitude double precision CHECK(latitude BETWEEN -90 AND 90), 
    longitude double precision CHECK(longitude BETWEEN -180 AND 180), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
    id uuid PRIMARY KEY, 
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id), 
    customer_user_id uuid NOT NULL REFERENCES users(id), 
    photographer_user_id uuid NOT NULL REFERENCES users(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id uuid PRIMARY KEY, 
    conversation_id uuid NOT NULL REFERENCES conversations(id), 
    sender_id uuid NOT NULL REFERENCES users(id), 
    client_message_id uuid NOT NULL, 
    content text, 
    media_id uuid REFERENCES media(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(sender_id,client_message_id), 
    CHECK(content IS NOT NULL OR media_id IS NOT NULL)
);

CREATE TABLE message_reads (
    id uuid PRIMARY KEY, 
    message_id uuid NOT NULL REFERENCES messages(id), 
    user_id uuid NOT NULL REFERENCES users(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(message_id,user_id)
);

CREATE TABLE notifications (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id), 
    title text NOT NULL, 
    body text NOT NULL, 
    event_id uuid, 
    read_at timestamptz, 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now(), 
    UNIQUE(user_id,event_id)
);

CREATE TABLE reports (
    id uuid PRIMARY KEY, 
    user_id uuid NOT NULL REFERENCES users(id), 
    target_type text NOT NULL CHECK(target_type IN ('user','review','booking','media')), 
    target_id uuid NOT NULL, 
    reason text NOT NULL, 
    status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','rejected','escalated')), 
    resolution text, 
    resolved_by uuid REFERENCES users(id), 
    created_at timestamptz NOT NULL DEFAULT now(), 
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE report_history (
    id uuid PRIMARY KEY, 
    report_id uuid NOT NULL REFERENCES reports(id), 
    actor_id uuid NOT NULL REFERENCES users(id), 
    status text NOT NULL, 
    resolution text NOT NULL, 
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

CREATE INDEX notifications_owner 
    ON notifications(user_id,created_at);
    
CREATE INDEX messages_conversation 
    ON messages(conversation_id,created_at,id);
