# Local API test data

The reviewed fixture contains 1 admin, 20 photographers, and 20 customers. Each customer has 7 bookings (140 total): 2 completed, 1 accepted, 1 pending, 1 cancelled, 1 rejected, and 1 expired. It also inserts role profiles, booking plans, portfolios, wallets, booking history, delivery records, feedback, escrow settlements, transactions, payment webhooks, and wallet ledger entries.

## Load the data

Start local services, then run the combined command:

```bash
pnpm docker:up
pnpm seed:local
pnpm start:dev
```

`seed:local` applies migrations, executes [`seed_lens-reviewed.sql`](../migrations/seed_lens-reviewed.sql), then provisions the matching users and realm roles in local Keycloak. PostgreSQL and Keycloak must be available; `.env` must contain the Keycloak URL, realm, client credentials, and admin credentials.

The SQL is a transaction containing literal `INSERT ... VALUES` statements. Review it before running; it contains no SQL generators or procedural seed logic. It is intended for a local database and `pnpm db:seed` refuses non-local database hosts unless `ALLOW_NONLOCAL_SEED=true` is explicitly set. Because the fixture uses plain inserts, a second run against the same data will hit unique constraints and roll back; use a clean database before rerunning it.

The SQL inserts placeholder `keycloak_id` values. `pnpm keycloak:seed` creates or finds the matching Keycloak users by email and synchronizes their actual Keycloak IDs back to the database. New users use `LensDemo@2026!` by default; set `MOCK_USER_PASSWORD` in `.env` to choose another password. Existing Keycloak users keep their current passwords. The Keycloak seeder refuses non-local Keycloak URLs unless `ALLOW_NONLOCAL_KEYCLOAK_SEED=true` is set.

## Demo accounts

| Role          | Email                                                              |
| ------------- | ------------------------------------------------------------------ |
| Admin         | `donguyennhianh@admin.com`                                         |
| Customers     | Full name without accents, joined, followed by `@customer.com`     |
| Photographers | Full name without accents, joined, followed by `@photographer.com` |

Get an API token with `POST /auth/login`:

```json
{
  "email": "hoangmaianh@customer.com",
  "password": "LensDemo@2026!"
}
```

Send the returned `access_token` as `Authorization: Bearer <access_token>`. Use an admin token for admin endpoints and a matching customer or photographer token for role-restricted endpoints. These are fictional local demo accounts, not real users.
