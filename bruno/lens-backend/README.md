# Lens Backend API — Bruno collection

This folder is a Bruno collection generated from the NestJS HTTP controllers in `src/features/api/http`. It contains **136 endpoint smoke requests** and a focused set of **6 Keycloak registration cases**.

## Import

In Bruno, choose **Open Collection** and select this `bruno/lens-backend` folder. Choose the `local` environment. The API defaults to `http://localhost:3000`; change `baseUrl` if your local server uses another URL.

## Start with account creation

Run the `00-keycloak-registration-cases` folder in order. It checks invalid email and short-password validation, creates or resumes an account, verifies a wrong password gets HTTP 401, retries the same registration, and exercises the username-collision path. A successful registration saves its access and refresh tokens into the active Bruno environment.

Use an email you control or a disposable local-test email in `registrationEmail`. Re-running with the same email and password is intended to exercise the retry behavior. For the username-collision case, set `usernameCollisionEmail` so its local part matches a username already present in your Keycloak realm while its full email is unused.

Before testing registration against a local database, apply migration `026_user_email_unique.sql` with `pnpm db:migrate`. It adds a case- and whitespace-insensitive unique email index and stops with an error if existing users already share a normalized email.

## Run endpoint smoke requests

Each controller endpoint has a request under its module folder. Requests use DTO-shaped example bodies where the controller declares a DTO, and valid placeholder UUIDs for resource IDs. Replace the tokens and IDs in the environment with records and role-specific tokens from your local database. Auth register/login responses save `accessToken`, `customerToken`, and `refreshToken` as runtime variables for the current collection run.

Each general endpoint request asserts that the API returns a status below 500. This is a reachability/runtime smoke check; an expected `400`, `401`, `403`, `404`, or `409` can still indicate missing sample data, an unset token, an invalid state transition, or a deliberately invalid webhook signature. For business-level happy paths, use a real local record in the required role and state.

## Requests that change data

Some requests create or update profiles, bookings, reviews, media, wallet entries, payment/refund records, subscriptions, reports, calendars, or admin settings. Run those against a local/test backend with disposable data, then replace the static idempotency keys before repeated payment runs if you want distinct transactions. Webhook examples deliberately use invalid signatures and should be treated as negative tests.

The collection does not make API calls during import.
