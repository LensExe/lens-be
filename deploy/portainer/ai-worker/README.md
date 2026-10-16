# Lens AI worker Portainer stack

This stack deploys the AI worker on the shared `lens-network`. It pulls the
worker image published by GitHub Actions and connects to the separate Ollama
stack at `http://ollama:11434`.

## Prerequisites

- Deploy the shared `lens-infra` and `lens-kafka` stacks first.
- Deploy `deploy/portainer/ollama/ollama-stack.yml` and wait for its
  `ollama-init` container to exit successfully before starting the worker.
- Deploy the Chat Service with its private AI routes enabled. Set
  `CHAT_SERVICE_AI_TOKEN` here to the same secret as `AI_WORKER_TOKEN` in the
  Chat Service stack.
- Apply the primary and AI database migrations before enabling replies. The
  PostgreSQL infra stack provides pgvector and creates the `lens_ai` database,
  but the application tables still need `pnpm db:migrate` and
  `pnpm db:migrate:ai`.
- Add the GitHub Container Registry credentials to Portainer if the package is
  private.

## Deploy in Portainer

1. Choose **Stacks → Add stack → Git repository**.
2. Select the `LensExe/lens-be` repository and the `master` reference.
3. Set the Compose path to `deploy/portainer/ai-worker/ai-worker-stack.yml`.
4. Add the values from `env.ai-worker.example` in the stack environment.
   Replace the four `CHANGE_ME` values with the matching credentials from
   infra, Kafka, and Chat Service. `POSTGRES_PASSWORD` must match the infra stack's
   PostgreSQL password; Redis and Kafka passwords must match their respective
   stacks.
5. Deploy the stack after Ollama has finished downloading the configured
   models.

The worker has no published host port. It communicates with Ollama, Kafka,
Redis, PostgreSQL, and Chat Service over `lens-network`. The worker uses Redis
DB 1 for Notification presence and Redis DB 2 for delayed jobs.

The stack defaults `AI_WORKER_ENABLED`, `KAFKA_ENABLED`, and
`AI_AUTO_REPLY_ENABLED` to `true`. Auto-replies remain opt-in per photographer:
that photographer must also have `enabled=true` and
`auto_reply_enabled=true` in `lens_ai.ai_assistant_settings`. Set
`AI_AUTO_REPLY_ENABLED=false` in Portainer to pause all customer replies.

## CI/CD updates

The `publish` job builds and pushes both `lens-backend` and `lens-ai-worker` to
GHCR, each with `latest`, `sha-<commit>`, and branch tags. After both pushes,
the deploy job calls `PORTAINER_WEBHOOK_URL` and
`PORTAINER_AI_WORKER_WEBHOOK_URL` when those GitHub Actions secrets are set.
Pull requests build both Dockerfiles as validation without pushing images.

For automatic AI worker updates, enable the stack's Portainer GitOps webhook,
turn on **Re-pull image**, and save its URL as the GitHub Actions secret
`PORTAINER_AI_WORKER_WEBHOOK_URL`. The stack uses `IMAGE_TAG=latest` by default.

For local image imports, set `AI_WORKER_IMAGE=lens-ai-worker:local` and
`AI_WORKER_PULL_POLICY=never`; the image must be present on the same Docker
node where the stack runs.
