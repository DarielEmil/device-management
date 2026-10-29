import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig, type AppConfig } from "./config/env.js";
import { createContainer } from "./container.js";

let config: AppConfig;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const container = createContainer(config);
const app = createApp({
  useCases: container.useCases,
  corsOrigins: config.corsOrigins,
  cookieSecure: config.cookieSecure,
});

const server = app.listen(config.port, () => {
  console.log(`Backend escuchando en http://devices.localhost:${config.port}/api`);
});

function shutdown() {
  server.close(() => {
    void container.close().finally(() => process.exit(0));
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
