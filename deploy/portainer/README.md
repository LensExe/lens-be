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
   file or enter the backend variables manually. Portainer exposes these
   values to the Compose file as `stack.env` on Docker Standalone.
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
credentials, and so on) stay in Portainer. They are injected through
`stack.env` and are not copied into the image or stored in GitHub Actions.
