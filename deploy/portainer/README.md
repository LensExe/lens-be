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
7. Set `BACKEND_IMAGE` to the image tag to deploy. The default is
   `ghcr.io/lensexe/lens-backend:latest`.
8. Set `BACKEND_HOST_PORT` to the host port (use `3001` if local port `3000`
   is already occupied).
9. Deploy the stack.

The Docker host must already have the external `lens-network` network and the
shared infrastructure containers (`lens-postgres`, `lens-redis`, `lens-minio`,
and `lens-keycloak`) attached to that network.

After the stack is healthy, enable **Create a stack webhook** in the stack's
Editor tab and save the copied URL as the GitHub Actions secret
`PORTAINER_WEBHOOK_URL`.
