# Kong Portainer stack

The stack uses one Compose file. It reads `kong.yml` from this same directory
and exposes it inside Kong at `/kong/declarative/kong.yml`.

In Portainer, configure:

- Compose path: `deploy/portainer/kong/kong-stack.yml`
- `KONG_CONFIG_PATH=./kong.yml`

The declarative config also routes Notification REST and Socket.IO traffic to
`http://notification:3001`. Deploy the Notification application separately on
the external `lens-network` with the Docker DNS name `notification`; the
Notification infrastructure Compose file alone does not create that app
container. The Socket.IO route uses `/api/v1/socket.io` for both polling and
WebSocket upgrade.

The local Compose file under `.docker/kong` is separate and is not loaded by
this stack.
