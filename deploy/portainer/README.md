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
backend stack. It creates PostgreSQL, Redis, S3-compatible storage, Keycloak,
and joins the shared external `lens-network` network.

The network must exist before deploying the stack. If it does not exist, create
it once on the Portainer Docker host:

```bash
docker network create lens-network
```

Marking it external avoids Compose label conflicts when Portainer or another
stack created the network first.

The default S3 images use fixed MinIO tags and pull policy `missing`. The tags
publish `linux/amd64` and `linux/arm64` variants, so the Docker host pulls the
correct architecture automatically:

```dotenv
MINIO_IMAGE=docker.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
MINIO_MC_IMAGE=docker.io/minio/mc:RELEASE.2025-08-13T08-35-41Z
MINIO_PULL_POLICY=missing
```

If the MinIO server and client images were imported into the Portainer Docker
environment from local `.tar` files, keep the exact tags and prevent Compose
from contacting the registry:

```dotenv
MINIO_IMAGE=docker.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
MINIO_MC_IMAGE=docker.io/minio/mc:RELEASE.2025-08-13T08-35-41Z
MINIO_PULL_POLICY=never
```

Import both images, and make sure their tags exist on the same Docker node
where this stack runs.
