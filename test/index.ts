try {
  if (process.env.OTEL_ENABLED === 'true') {
    require('@godspeedsystems/tracing').initialize();
  }
} catch (error) {
  console.error("OTEL_ENABLED is set, unable to initialize opentelemetry tracing.");
  console.error(error);
  process.exit(1);
}

import Godspeed from "@godspeedsystems/core";

async function bootstrap() {
  const gsApp = new Godspeed();
  gsApp.withoutEventSource = true;
  await gsApp.initialize();
  return gsApp;
}

const appPromise = bootstrap();
export default appPromise;