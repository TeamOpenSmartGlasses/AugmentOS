FROM node:18-slim

# Install bun, PM2, and other build tools
RUN apt-get update && apt-get install -y curl unzip git python3 make g++ && \
    curl -fsSL https://bun.sh/install | bash && \
    npm install -g typescript pm2

ENV PATH="/root/.bun/bin:${PATH}"
ENV NODE_ENV=development
# Skip Sentry sourcemap upload in Docker build
ENV SKIP_SENTRY_UPLOAD=true

WORKDIR /app

# Copy the entire application
COPY . .

# Modify the cloud package's build script to remove Sentry sourcemaps
RUN sed -i 's/&& bun run sentry:sourcemaps && npm run sentry:sourcemaps//' packages/cloud/package.json

# Install dependencies with bun
RUN bun install --frozen-lockfile

# Ensure the directory structure exists
RUN mkdir -p \
    packages/utils/dist \
    packages/agents/dist \
    packages/sdk/dist \
    packages/config/dist \
    packages/types/dist \
    packages/apps/dashboard-manager/dist \
    packages/apps/flash/dist \
    packages/apps/live-captions/dist \
    packages/apps/miraai/dist \
    packages/apps/notify/dist \
    packages/cloud/dist

# Set environment variable to skip strict type checking for build
ENV TS_NODE_TRANSPILE_ONLY=1

# Build packages in the correct sequence to handle dependencies
RUN cd packages/config && bun run build && \
    cd ../types && bun run build && \
    cd ../utils && bun run build && \
    cd ../sdk && bun run build && \
    cd ../agents && bun run build && \
    cd ../apps/dashboard-manager && bun run build || true && \
    cd ../flash && bun run build || true && \
    cd ../live-captions && bun run build || true && \
    cd ../miraai && bun run build || true && \
    cd ../notify && bun run build || true && \
    cd ../../cloud && bun run build

# Ensure LC3 directory exists in dist and copy the WASM file
RUN mkdir -p packages/utils/dist/lc3 && \
    cp packages/utils/src/lc3/liblc3.wasm packages/utils/dist/lc3/

# Expose necessary ports
EXPOSE 8002 8010 8011 8012 8013 8014 8015

# Set hostname environment variable for inter-service communication
ENV HOST=0.0.0.0

# Run the application using PM2 with the development ecosystem config
CMD ["pm2-runtime", "dev-ecosystem.config.js"] 