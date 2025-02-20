// augmentos_cloud/packages/cloud/src/sentry.ts

import * as Sentry from "@sentry/bun";
import { mongooseIntegration } from '@sentry/bun';
import { NODE_ENV, SENTRY_DSN } from '@augmentos/config';

// import * as Sentry from "@sentry/node";
// import { nodeProfilingIntegration } from '@sentry/profiling-bun';

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    mongooseIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  environment: NODE_ENV,
});