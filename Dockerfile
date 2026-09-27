# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

# Install pnpm and add it to PATH
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

# Set working directory
WORKDIR /app

# Install corepack and prepare pnpm and activate it
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

# Keep dependency installation cacheable when only application source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps/core/tsconfig.app.json apps/core/tsconfig.app.json
COPY apps/cli/tsconfig.app.json apps/cli/tsconfig.app.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application source code
COPY apps/core apps/core
COPY src src

# Build the application
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /app

#  Create a non-root user and group for running the application
RUN groupadd --system --gid 1001 lens \
  && useradd --system --uid 1001 --gid lens --create-home lens

# Copy package.json and lock files to install production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies and clean up cache
RUN corepack enable \
  && corepack prepare pnpm@11.1.2 --activate \
  && pnpm install --prod --frozen-lockfile --ignore-scripts \
  && rm -rf /root/.cache /root/.local/share/pnpm

# Copy built application from the build stage and set ownership
COPY --from=build --chown=lens:lens /app/dist ./dist

# Set ownership of node_modules to the non-root user
RUN chown -R lens:lens /app/node_modules

# Switch to the non-root user for running the application
USER lens

EXPOSE 3000

# /docs is registered by the core API setup and does not require authentication.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/docs').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Set the command to run the application
CMD ["node", "dist/apps/core/apps/core/src/main.js"]
