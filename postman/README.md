# Lens Backend API — Postman

This directory contains the Lens Backend API as a native Postman Collection v3 YAML collection for Postman v12. It includes 140 HTTP requests (134 API smoke requests and 6 Keycloak registration cases) plus one WebSocket request. The original request folders, docs, body examples, response checks, and token-saving scripts are preserved.

## Open in Postman

Use Postman Desktop v12 Local View and connect the repository folder. The collection is under `postman/collections/lens-backend`; the local environment is `postman/environments/lens-backend-local.environment.yaml`. Select **Lens Backend Local** after opening the environment. The API defaults to `http://localhost:3000`; change `baseUrl` when needed.

The collection can also be run with Postman CLI:

```sh
postman collection run postman/collections/lens-backend \
  --environment postman/environments/lens-backend-local.environment.yaml
```

Set `registrationEmail`, `registrationPassword`, role tokens, and resource IDs to match your local Keycloak realm and database before running authenticated or mutating requests. Credential values are placeholders in the checked-in environment. Successful register, login, and refresh requests save `accessToken`, `customerToken`, and `refreshToken` to the active Postman environment.

## Start with account creation

Run the `00-keycloak-registration-cases` folder in order. It checks invalid email and short-password validation, creates or resumes an account, verifies that a wrong password returns HTTP 401, retries the same registration, and exercises the username-collision path. Set `registrationEmail` to an email you control or a disposable local-test email. Re-running with the same email and password is intended to exercise the retry behavior. For the username-collision case, set `usernameCollisionEmail` so its local part matches a username already present in your Keycloak realm while its full email is unused.

Before testing registration against a local database, apply migration `026_user_email_unique.sql` with `pnpm db:migrate`. It adds a case- and whitespace-insensitive unique email index and stops with an error if existing users already share a normalized email.

## Run endpoint smoke requests

Each controller endpoint has a request under its module folder. Requests use DTO-shaped example bodies where the controller declares a DTO, and valid placeholder UUIDs for resource IDs. Replace tokens and IDs with records and role-specific tokens from your local database. Each API smoke request checks that the API returns a status below 500; expected `400`, `401`, `403`, `404`, or `409` responses can still indicate missing sample data, an unset token, an invalid state transition, or a deliberately invalid webhook signature. For business-level happy paths, use a real local record in the required role and state.

The WebSocket request connects to the Socket.IO Engine.IO endpoint at `ws://localhost:3001/api/v1/socket.io/?EIO=4&transport=websocket` and sends the configured bearer token in the handshake header.

## Requests that change data

Some requests create or update profiles, bookings, reviews, media, wallet entries, payment/refund records, subscriptions, reports, calendars, or admin settings. Run those against a local/test backend with disposable data, then replace the static idempotency keys before repeated payment runs if you want distinct transactions. Webhook examples deliberately use invalid signatures and should be treated as negative tests.

The collection does not make API calls during import.
