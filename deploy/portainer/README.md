# Portainer backend stack

This stack runs the backend image published by GitHub Actions. It does not
build from source and it does not contain runtime secrets.

## Portainer setup

1. Open **Stacks → Add stack → Git repository**.
2. Use the `LensExe/lens-be` repository.
3. Select the `master` reference.
4. Set the Compose path to `deploy/portainer/backend-stack.yml`.
5. Configure the GitHub Container Registry in Portainer with a token that has
   `read:packages` permission.
6. In **Environment variables**, load the ignored local `.env.production`
   file or enter the backend variables manually. The Compose file maps these
   Portainer variables into the backend container, so no secret file needs to
   be committed to Git.
7. Add the deployment variables below:

   ```dotenv
   IMAGE_REGISTRY=ghcr.io
   IMAGE_OWNER=lensexe
   IMAGE_TAG=latest
   BACKEND_PULL_POLICY=always
   BACKEND_HOST_PORT=3000
   ```

   `BACKEND_HOST_PORT` can be `3001` if local port `3000` is already occupied.

8. Deploy the stack.

For a backend image imported into the Portainer Docker environment from a
local `.tar` file, use the imported tag instead of the registry variables:

```dotenv
BACKEND_IMAGE=lens-backend:local
BACKEND_PULL_POLICY=never
BACKEND_HOST_PORT=3000
```

The `lens-backend:local` tag must exist on the same Docker node where this
stack runs. This local mode is for testing; the GitHub Actions flow should use
the registry mode above so Portainer can re-pull each published image.

The Docker host must already have the external `lens-network` network and the
shared infrastructure containers (`lens-postgres`, `lens-redis`, `lens-minio`,
and `lens-keycloak`) attached to that network.

After the stack is healthy, open the stack settings, enable **GitOps updates**,
choose **Webhook**, and enable **Re-pull image**. Save the generated GitOps
webhook URL as the GitHub Actions repository/environment secret
`PORTAINER_WEBHOOK_URL`.

GitHub Actions publishes `latest` plus an immutable `sha-<commit>` tag. After
publishing, it calls the GitOps webhook. Portainer checks out the new commit
from `master`, re-pulls the `latest` backend image, and redeploys the service.
The immutable `sha-<commit>` tags remain available for a manual rollback by
setting `IMAGE_TAG` in Portainer.

The backend runtime variables (`DB_*`, `REDIS_*`, `S3_*`, `JWT_*`, payment
credentials, and so on) stay in Portainer. They are passed through the
Compose `environment` mapping and are not copied into the image or stored in
GitHub Actions.

## Portainer infrastructure stack

Deploy `deploy/portainer/infra-stack.yml` as a separate stack before the
backend stack. It creates PostgreSQL, Redis, S3-compatible storage, and
Keycloak, and joins the shared external `lens-network` network. Caddy is
deployed separately from `deploy/docker-compose.caddy.yml`.

The network must exist before deploying the stack. If it does not exist, create
it once on the Portainer Docker host:

```bash
docker network create lens-network
```

Marking it external avoids Compose label conflicts when Portainer or another
stack created the network first.

### Caddy gateway and domain routing

`deploy/portainer/caddy/Caddyfile` contains the centralized domain routes.
Deploy one separate Caddy stack from `deploy/portainer/lens-caddy.yml`; it binds
host ports `80/443`.
The FE, backend, Keycloak, MinIO, and Kong Compose services do not need Caddy
labels. They only need to join the shared `lens-proxy` network so Caddy can
reach them by their Docker service names.

In Portainer, add a Git stack from `LensExe/lens-be`, branch `master`, with
Compose path `deploy/portainer/lens-caddy.yml`. Set the domain variables below
in that Caddy stack's environment variables. Create `lens-proxy` first, deploy
infra/backend/FE and Kong, then deploy Caddy. Only this stack should publish
host ports `80/443`.

If the older Caddy stack is already running, update that stack to the new
Compose path instead of starting a second proxy; two Caddy containers cannot
both bind `80/443`.

Create a second external Docker network named `lens-proxy` once on the same
Docker host (Portainer **Networks → Add network**, driver `bridge`, or
`docker network create lens-proxy`) before deploying the updated stacks. Only
the gateway and services that should receive domain traffic join this network;
PostgreSQL and Redis stay off it. Do not remove the existing `lens-network`.

Put all domain names in the Caddy stack's Portainer environment, not in the
individual application stacks:

```dotenv
ACME_EMAIL=you@example.com
LANDING_DOMAIN=www.example.com
PORTAL_DOMAIN=app.example.com
ADMIN_DOMAIN=admin.example.com
BACKEND_DOMAIN=api-direct.example.com
KONG_DOMAIN=api.example.com
KONG_UPSTREAM=lens-kong:8000
KEYCLOAK_DOMAIN=auth.example.com
MINIO_S3_DOMAIN=s3.example.com
MINIO_CONSOLE_DOMAIN=minio-console.example.com
PORTAINER_DOMAIN=portainer.example.com
PORTAINER_UPSTREAM=portainer:9000
```

`api.example.com` routes to Kong; `api-direct.example.com` routes directly to
the backend and is mainly useful for testing. The direct route can be omitted
or restricted after confirming Kong works. `KONG_UPSTREAM` must resolve to the
Kong container on `lens-proxy`; change it if your Kong service has a different
Docker network alias or proxy port. Missing domain variables default to
`.localhost` hostnames for testing. Point real domain A records to the VPS IP
and allow inbound TCP `80` and `443` in the VPS firewall.

To route Portainer, attach the Portainer Server container to the same external
`lens-proxy` network and set `PORTAINER_UPSTREAM` to its Docker network alias
and internal HTTP port (usually `portainer:9000`). Do not publish port `9000`
to the public host; Caddy should be the only public entry point. If Portainer
has HTTP disabled, configure a trusted HTTPS upstream instead of disabling TLS
verification. Portainer is an administrative interface: restrict the hostname
with a VPN, access gateway, or IP allowlist, and keep strong authentication and
MFA enabled before exposing it publicly.

The current Portainer `infra-stack.yml` does not include a Kong service, so it
does not create Kong. If Kong is deployed by another stack, attach its proxy
service to `lens-proxy`; the Caddyfile assumes the network alias `lens-kong` and
proxy port `8000` by default.

Keep Kong Admin API ports `8001/8002` private. Keycloak is configured to trust
`X-Forwarded-*` headers from Caddy; set its public hostname and OAuth redirect
URIs to the final HTTPS domain before production login.

The Compose file embeds the Caddyfile content so Portainer can deploy it without
a host-side config path. Keep that embedded block in sync with
`deploy/portainer/caddy/Caddyfile`
when routes change. This avoids relying on Portainer's Git-relative path-volume
feature, which is available in Business Edition but not Community Edition.
Unlike Caddy Docker Proxy, this setup does not mount the Docker socket.

The default S3 images use public `netiedge` mirrors with fixed release tags and
pull policy `missing`:

```dotenv
MINIO_IMAGE=netiedge/minio:RELEASE.2025-01-20T14-49-07Z
MINIO_MC_IMAGE=netiedge/minio-mc:RELEASE.2025-01-17T23-25-50Z
MINIO_PULL_POLICY=missing
```

If the MinIO server and client images were imported into the Portainer Docker
environment from local `.tar` files, keep the same release tags and prevent
Compose from contacting the registry:

```dotenv
MINIO_IMAGE=netiedge/minio:RELEASE.2025-01-20T14-49-07Z
MINIO_MC_IMAGE=netiedge/minio-mc:RELEASE.2025-01-17T23-25-50Z
MINIO_PULL_POLICY=never
```

Import both images, and make sure their tags exist on the same Docker node
where this stack runs.
