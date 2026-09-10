# Google login through Keycloak

Google is configured as a Keycloak Identity Provider. Lens never accepts a
Google token directly: Google authenticates the user, Keycloak creates or links
the realm user, and Lens verifies only access tokens issued by Keycloak.

## Required configuration

```env
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8089
KEYCLOAK_REALM=lens
KEYCLOAK_CLIENT_ID=lens-be
KEYCLOAK_SECRET=<keycloak-client-secret>
KEYCLOAK_ADMIN_USERNAME=lens-admin-keycloak
KEYCLOAK_ADMIN_PASSWORD=<keycloak-admin-password>

GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
KEYCLOAK_GOOGLE_REDIRECT_URI=http://localhost:3000/keycloak/google/callback
```

`KEYCLOAK_GOOGLE_REDIRECT_URI` must be exposed through the same public API path
used by the browser. When Kong adds `/api/v1`, configure the URI with that
prefix.

Run the idempotent setup after Keycloak is available:

```bash
pnpm keycloak:google:setup
```

The command creates or updates the realm client, audience mapper and Google
Identity Provider. It prints the Keycloak broker callback that must be entered
as an **Authorized redirect URI** in Google Cloud Console.

## API flow

1. Call `GET /keycloak/google/login`.
2. Navigate the browser to the returned `authorization_url`.
3. Google returns to Keycloak; Keycloak returns to
   `GET /keycloak/google/callback?code=...&state=...`.
4. Lens validates one-time state and PKCE, exchanges the code, verifies the
   Keycloak token and creates the local domain profile on first login.

The callback response contains Keycloak access and refresh tokens. Clients
should keep the access token in memory and store refresh credentials using the
platform's secure storage strategy.
