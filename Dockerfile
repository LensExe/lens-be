# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Keep dependency installation cacheable when only application source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/core/tsconfig.app.json apps/core/tsconfig.app.json
COPY apps/cli/tsconfig.app.json apps/cli/tsconfig.app.json

RUN pnpm install --frozen-lockfile

COPY apps/core apps/core
COPY src src

RUN pnpm build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 lens \
  && useradd --system --uid 1001 --gid lens --create-home lens

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@11.1.2 --activate \
  && pnpm install --prod --frozen-lockfile --ignore-scripts \
  && rm -rf /root/.cache /root/.local/share/pnpm

COPY --from=build --chown=lens:lens /app/dist ./dist
RUN chown -R lens:lens /app/node_modules

USER lens

EXPOSE 3000

# /docs is registered by the core API setup and does not require authentication.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/docs').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/apps/core/apps/core/src/main.js"]
