-- Create separate databases for Kong and Keycloak (run automatically when PostgreSQL initializes).
SELECT 'CREATE DATABASE kong' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kong')\gexec
SELECT 'CREATE DATABASE keycloak' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
