import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { mongooseIntegration } from '@sentry/node';
import { MONGO_URL, NODE_ENV, SENTRY_DSN } from '@augmentos/config';

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
    mongooseIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  environment: NODE_ENV,
});