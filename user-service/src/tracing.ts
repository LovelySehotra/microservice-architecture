import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Concept: Distributed tracing initialization to track request lifecycles across service boundaries
const sdk = new NodeSDK({
  serviceName: 'user-service',
  traceExporter: new OTLPTraceExporter({
    url: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Concept: Graceful shutdown of tracing SDK to prevent memory leaks and ensure buffer flush on termination
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
