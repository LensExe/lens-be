# Portainer backend stack

This stack runs the backend image published by GitHub Actions. It does not
build from source and it does not contain runtime secrets.

## Infrastructure stack

Deploy `deploy/portainer/infra-stack.yml` as a separate Portainer stack before
deploying this backend stack. It starts the shared PostgreSQL, Redis, MinIO and
Keycloak services, creates the `lens` bucket, and owns the shared
`lens-network` network. The backend stack then joins that network as an
external network.

In Portainer, create the infrastructure stack from the same Git repository with
the compose path `deploy/portainer/infra-stack.yml`. Add the variables listed in
[`infra-stack.env.example`](./infra-stack.env.example) under **Environment
variables** and replace every `CHANGE_ME` value with a strong secret. Do not
commit the real values.

Deploy this stack first, wait until `lens-postgres`, `lens-redis`,
`lens-minio`, and `lens-keycloak` are running, and then deploy
`backend-stack.yml`.

The backend must use these internal Docker DNS names and ports:

```dotenv
DB_HOST=lens-postgres
DB_PORT=5432
REDIS_HOST=lens-redis
REDIS_PORT=6379
S3_MINIO_ENDPOINT=http://lens-minio:9000
KEYCLOAK_URL=http://lens-keycloak:8080
KEYCLOAK_AUTH_SERVER_URL=http://lens-keycloak:8080
```

For browser-facing presigned URLs and Keycloak redirects, replace the public
endpoints with the server IP/domain and the published host ports (`9000` and
`8089`). Internal Docker hostnames are not resolvable by a customer's browser.

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
   BACKEND_HOST_PORT=3000
   ```

   `BACKEND_HOST_PORT` can be `3001` if local port `3000` is already occupied.

8. Deploy the stack.

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
