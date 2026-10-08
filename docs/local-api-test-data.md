# Local API test data

The fixed demo fixtures contain linked records for exactly 1 admin, 5 customers, and 10 photographers. The local Keycloak seed creates matching accounts and aligns `keycloak_id`, so their tokens resolve to the seeded Lens profiles. Generated scale fixtures are database-only and are not provisioned in Keycloak.

## Load the demo data

Start the local services, then run the combined seed command:

```bash
pnpm docker:up
pnpm seed:local
pnpm start:dev
```

`seed:local` applies database migrations, loads the 16 fixed demo accounts (and any opt-in scale fixtures), uploads the bundled stock-photo pack to local MinIO, then provisions those accounts and their `customer`, `photographer`, or `admin` realm roles in the local Keycloak realm from `.env`. PostgreSQL, MinIO, and Keycloak must be running. Keycloak must be at `KEYCLOAK_AUTH_SERVER_URL` (or `KEYCLOAK_URL`), and `.env` must contain `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ADMIN_USERNAME`, and `KEYCLOAK_ADMIN_PASSWORD`.

New demo users use `LensDemo@2026!` by default. Set `MOCK_USER_PASSWORD` in `.env` to choose another password. The Keycloak seed provisions only these 16 fixed demo accounts, synchronizes their profile and realm role, and aligns the database `keycloak_id`; existing Keycloak passwords are unchanged. The seeder refuses non-local Keycloak URLs unless `ALLOW_NONLOCAL_KEYCLOAK_SEED=true` is explicitly set.

## Demo accounts

| Role         | Email                        | Status |
| ------------ | ---------------------------- | ------ |
| Admin        | `admin@lens.test`            | Active |
| Customer     | `mai.anh@lens.test`          | Active |
| Customer     | `quoc.bao@lens.test`         | Active |
| Customer     | `phuong.linh@lens.test`      | Active |
| Customer     | `thanh.tung@lens.test`       | Active |
| Customer     | `hai.yen@lens.test`          | Active |
| Photographer | `an.binh.photo@lens.test`    | Active |
| Photographer | `lequanghuy.photo@gmail.com` | Active |
| Photographer | `minh.tuan.photo@lens.test`  | Active |
| Photographer | `thu.thao.photo@lens.test`   | Active |
| Photographer | `hoang.long.photo@lens.test` | Active |
| Photographer | `khanh.vy.photo@lens.test`   | Active |
| Photographer | `ngoc.linh.photo@lens.test`  | Active |
| Photographer | `duc.thanh.photo@lens.test`  | Active |
| Photographer | `gia.bao.photo@lens.test`    | Active |
| Photographer | `thu.trang.photo@lens.test`  | Active |

Get an API token with `POST /auth/login`:

```json
{
  "email": "mai.anh@lens.test",
  "password": "LensDemo@2026!"
}
```

Send the returned `access_token` as `Authorization: Bearer <access_token>`. Use an admin token for admin endpoints and the matching customer or photographer token for role-restricted endpoints.

## Dataset size

`pnpm db:seed` uses the `none` profile by default, leaving exactly the 16 fixed demo accounts above: 1 admin, 5 customers, and 10 photographers. It still seeds their related plans, portfolios, wallets, bookings, and other demo fixtures. Opt in to generated load with `SEED_SCALE=small`, `SEED_SCALE=medium`, or `SEED_SCALE=large`; these profiles add 20/100/500, 100/1,000/5,000, or 1,000/10,000/100,000 synthetic photographers/customers/bookings, respectively. For custom loads, set `SEED_PHOTOGRAPHERS`, `SEED_CUSTOMERS`, and `SEED_BOOKINGS`. Operational timestamps are relative to the seed run, and subscription periods remain active.

Choose a profile with `SEED_SCALE=small`, `SEED_SCALE=medium`, or `SEED_SCALE=large`. The profiles create 20/100/500, 100/1,000/5,000, or 1,000/10,000/100,000 photographers/customers/bookings, respectively. For a custom load, set `SEED_PHOTOGRAPHERS`, `SEED_CUSTOMERS`, and `SEED_BOOKINGS`; limits are 100,000 photographers, 500,000 customers, and 1,000,000 bookings.

```bash
SEED_SCALE=large pnpm db:seed
SEED_PHOTOGRAPHERS=250 SEED_CUSTOMERS=2500 SEED_BOOKINGS=25000 pnpm db:seed
```

Synthetic accounts use `@seed.invalid` emails and deterministic IDs. They are database-only fixtures and cannot log in through Keycloak. Demo portfolios use a varied stock-photo pack copied into MinIO under `public/demo-stock/`; each album is labeled as demo stock so it is not mistaken for work created by the fictional photographer. `SEED_MEDIA_PHOTOGRAPHERS` sets how many generated photographers receive three gallery images (default 250, maximum 1,000); fixed demo portfolios are always populated. Use `pnpm db:seed:media` to re-upload/relink images without recreating the database fixtures. Source IDs and license notes are in [`scripts/assets/demo-stock/SOURCES.md`](../scripts/assets/demo-stock/SOURCES.md).

Each `pnpm db:seed` run removes the previous scale-generated rows identified by the reserved `@seed.invalid` addresses, then recreates the selected profile. Setting scale counts to zero leaves only the fixed 16 accounts and curated demo fixtures. The fixed demo fixtures keep their stable IDs. Scale-generated accounts are not provisioned in Keycloak; use `pnpm seed:local` to run migrations, database seeding, media upload, and local Keycloak provisioning together.

## Useful seeded resource IDs

| Resource                              | ID                                     |
| ------------------------------------- | -------------------------------------- |
| Customer profile — Hoàng Mai Anh      | `20000000-0000-4000-8000-000000000001` |
| Photographer profile — Lê Quang Huy   | `30000000-0000-4000-8000-000000000001` |
| Photographer profile — Phạm Minh Tuấn | `30000000-0000-4000-8000-000000000002` |
| Booking plan — Portrait Demo          | `50000000-0000-4000-8000-000000000001` |
| Booking — sample 1                    | `d0000000-0000-4000-8000-000000000001` |
| Booking — sample 2                    | `d0000000-0000-4000-8000-000000000002` |

For new registration and photographer-approval flows, use a fresh email address with `POST /auth/register` and set `role` to `customer` or `photographer`. Admin accounts are seeded separately and public registration does not accept the `admin` role.
