# Portainer backend stack

This stack runs the backend image published by GitHub Actions. It does not
build from source and it does not contain runtime secrets.

## Portainer setup

1. Open **Stacks → Add stack → Git repository**.
2. Use the `LensExe/lens-be` repository.
3. Select the `master` reference.
4. Set the Compose path to `deploy/portainer/backend/backend-stack.yml`.
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
   ```

8. Deploy the stack.

For a backend image imported into the Portainer Docker environment from a
local `.tar` file, use the imported tag instead of the registry variables:

```dotenv
BACKEND_IMAGE=lens-backend:local
BACKEND_PULL_POLICY=never
```

The `lens-backend:local` tag must exist on the same Docker node where this
stack runs. This local mode is for testing; the GitHub Actions flow should use
the registry mode above so Portainer can re-pull each published image.

The backend has no published host port. It listens only on `lens-network` and
is reachable through Kong at the public API domain. The Docker host must
already have the external `lens-network` network and the shared infrastructure
containers (`lens-postgres`, `lens-redis`, `lens-mongodb`, `lens-minio`, and
`lens-keycloak`) attached to that network.

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

To enable the photographer AI API, set `AI_API_ENABLED=true` in this backend
stack's Portainer environment and provide the AI database connection with
`AI_DATABASE_URL` or `AI_DB_HOST`, `AI_DB_PORT`, `AI_DB_USERNAME`,
`AI_DB_PASSWORD`, and `AI_DB_NAME`. The stack passes these values to the
backend container. Provision the AI database and apply `pnpm db:migrate:ai`
before enabling the API; otherwise the routes may register but their database
requests will fail.

## AI worker stack

Deploy Ollama first from `deploy/portainer/ollama/ollama-stack.yml` and wait for
its model download to finish. Then deploy the worker from
`deploy/portainer/ai-worker/ai-worker-stack.yml`. The model settings and
Portainer steps are documented in `deploy/portainer/ollama/README.md`; the
worker's shared secrets, database and Kafka prerequisites, auto-reply controls,
and GitOps webhook instructions are in
`deploy/portainer/ai-worker/README.md`. The GitHub Actions publish job builds
both `lens-backend` and `lens-ai-worker`; configure the optional secret
`PORTAINER_AI_WORKER_WEBHOOK_URL` to redeploy the worker stack after publishing.

## Shared data and Kafka stacks

Deploy `deploy/portainer/infra/infra-stack.yml` as the `lens-infra` stack. It
provides PostgreSQL, Redis, one MongoDB instance, MinIO, and Keycloak on the
external `lens-network`. Its MongoDB instance has a separate database and
read/write account for each service:

| Service           | Mongo database   | Mongo network alias    | Redis database use                           |
| ----------------- | ---------------- | ---------------------- | -------------------------------------------- |
| Lens Backend      | —                | —                      | `0` cache/token state; `2` BullMQ media jobs |
| Lens Notification | `noti_system_db` | `notification-mongodb` | `1` notification and mail queues             |
| Lens Chat Service | `chat_direct`    | `chat-mongodb`         | —                                            |

The `lens-mongodb-init` one-shot service creates or updates the two application
accounts on each infra stack deployment. Set `MONGO_ROOT_*`,
`MONGO_NOTIFICATION_*`, and `MONGO_CHAT_*` in Portainer from
`deploy/portainer/infra/infra.env.example`. Replace every `CHANGE_ME` value.
The Mongo app accounts only have `readWrite` on their own database. Wait for
`lens-mongodb-init` to exit successfully before deploying application stacks.
Use these connection settings there (URL-encode passwords if they contain
reserved URI characters):

```dotenv
# Lens Notification
MONGO_URI=mongodb://<notification-user>:<notification-password>@notification-mongodb:27017/?authSource=noti_system_db
MONGO_DB_NAME=noti_system_db
REDIS_HOST=lens-redis
REDIS_PORT=6379
REDIS_DB=1

# Lens Chat Service
MONGO_URI=mongodb://<chat-user>:<chat-password>@chat-mongodb:27017/?authSource=chat_direct
MONGO_DATABASE=chat_direct
```

Use `REDIS_HOST=lens-redis`, `REDIS_PORT=6379`, the same `REDIS_PASSWORD` as
the infra stack, `REDIS_DB=0`, and `BULLMQ_REDIS_DB=2` for Lens Backend. Redis
starts with 16 logical databases; DB 0 is for Backend cache/token state, DB 1
is for Notification queues, and DB 2 is for Backend BullMQ jobs. These are
separate key spaces on one Redis server, not separate resource or security
boundaries. The stack publishes Mongo only on host loopback port `27018` for
local administration; containers should use the network aliases above.

Deploy Kafka separately from `deploy/portainer/kafka/kafka-stack.yml` as the
`lens-kafka` stack. It joins the same external `lens-network`, listens to other
containers at `kafka:9094` with SASL/PLAIN, and creates the notification, mail,
and chat topics when the broker is ready. Set `KAFKA_PASSWORD` and
`KAFKA_CONTROLLER_PASSWORD` from `deploy/portainer/kafka/kafka.env.example`;
producer and consumer stacks must use that same `KAFKA_PASSWORD` with
`KAFKA_USERNAME=kafka`, `KAFKA_BROKERS=kafka:9094`, and `KAFKA_SSL=false`.
The backend stack accepts these variables too; set `KAFKA_ENABLED=true` when
the backend should publish notification events or mail commands.

Create `lens-network` once on the Docker host if it does not exist:

```bash
docker network create lens-network
```

Marking it external lets all three stacks join the same network without
Compose trying to create or rename it. Deploy in this order: `lens-infra`,
`lens-kafka`, then the backend, notification, and chat application stacks.
The existing Notification and Chat Compose files also define their own Mongo
and/or Kafka containers. Remove those support services and their local
`depends_on` entries when switching the application stacks to these shared
containers, so Docker DNS has a single `kafka` and Mongo alias. Their old Mongo
volumes are not copied into `lens-mongo-data`; back up and migrate existing
data before pointing a live service at the shared database.

For Portainer, add one Git stack for each Compose path above and enter the
variables from its matching `*.env.example` in the stack environment. For local
Compose, copy the examples to ignored local files (for example,
`deploy/portainer/infra/env.infra.local` and
`deploy/portainer/kafka/env.kafka.local`) and run:

```bash
docker compose --env-file deploy/portainer/infra/env.infra.local \
  -f deploy/portainer/infra/infra-stack.yml up -d
docker compose --env-file deploy/portainer/kafka/env.kafka.local \
  -f deploy/portainer/kafka/kafka-stack.yml up -d
```

### Caddy gateway and domain routing

`deploy/portainer/caddy/Caddyfile` contains the centralized domain routes.
Deploy one separate Caddy stack from
`deploy/portainer/caddy/lens-caddy.yml`; it binds host ports `80/443`.
The FE, Keycloak, MinIO, and Kong Compose services do not need Caddy labels.
Only edge services (Kong, Keycloak, and MinIO) join `lens-proxy`; backend,
Chat, and Notification stay on the private `lens-network` and are reachable
from outside only through Kong.

In Portainer, add a Git stack from `LensExe/lens-be`, branch `master`, with
Compose path `deploy/portainer/caddy/lens-caddy.yml`. Set the domain variables
below in that Caddy stack's environment variables. Create `lens-proxy` first, deploy
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
KONG_DOMAIN=api.example.com
KONG_UPSTREAM=lens-kong:8000
KEYCLOAK_DOMAIN=auth.example.com
MINIO_S3_DOMAIN=s3.example.com
MINIO_CONSOLE_DOMAIN=minio-console.example.com
PORTAINER_DOMAIN=portainer.example.com
PORTAINER_UPSTREAM=portainer:9000
```

`api.example.com` is the only public API route and points to Kong.
`KONG_UPSTREAM` must resolve to the Kong container on `lens-proxy`; change it
if your Kong service has a different Docker network alias or proxy port.
Missing domain variables default to `.localhost` hostnames for testing. Point
real domain A records to the VPS IP and allow inbound TCP `80` and `443` in
the VPS firewall.

To route Portainer, attach the Portainer Server container to the same external
`lens-proxy` network and set `PORTAINER_UPSTREAM` to its Docker network alias
and internal HTTP port (usually `portainer:9000`). Do not publish port `9000`
to the public host; Caddy should be the only public entry point. If Portainer
has HTTP disabled, configure a trusted HTTPS upstream instead of disabling TLS
verification. Portainer is an administrative interface: restrict the hostname
with a VPN, access gateway, or IP allowlist, and keep strong authentication and
MFA enabled before exposing it publicly.

The current Portainer `deploy/portainer/infra/infra-stack.yml` does not include
a Kong service, so it does not create Kong. If Kong is deployed by another
stack, attach its proxy service to `lens-proxy`; the Caddyfile assumes the
network alias `lens-kong` and proxy port `8000` by default.

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
