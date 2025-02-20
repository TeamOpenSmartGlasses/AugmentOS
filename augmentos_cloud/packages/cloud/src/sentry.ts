// augmentos_cloud/packages/cloud/src/sentry.ts

import * as SentryBun from "@sentry/bun";
import * as SentryNode from "@sentry/node";

// Import the mongoose integration from both packages
import { mongooseIntegration as mongooseIntegrationBun } from "@sentry/bun";
import { mongooseIntegration as mongooseIntegrationNode } from "@sentry/node";

import { NODE_ENV, SENTRY_DSN } from "@augmentos/config";

// Choose the integration based on the runtime.
if (typeof Bun !== "undefined") {
  // Running under Bun (development)
  SentryBun.init({
    dsn: SENTRY_DSN,
    integrations: [
      mongooseIntegrationBun()
    ],
    tracesSampleRate: 1.0,
    environment: NODE_ENV,
  });
} else {
  // Running under Node (production)
  SentryNode.init({
    dsn: SENTRY_DSN,
    integrations: [
      mongooseIntegrationNode()
    ],
    tracesSampleRate: 1.0,
    environment: NODE_ENV,
  });
}
