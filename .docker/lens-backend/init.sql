-- Create separate databases for Kong, Keycloak, and Lens AI during first initialization.
SELECT 'CREATE DATABASE kong'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kong')\gexec

SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

SELECT format('CREATE DATABASE %I OWNER %I', 'lens_ai', current_user)
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'lens_ai')\gexec

-- The pgvector image installs the extension files at the server level; enable it
-- inside the dedicated AI database before application migrations run.
\connect lens_ai
CREATE EXTENSION IF NOT EXISTS vector;
