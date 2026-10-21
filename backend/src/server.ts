import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createUseCases } from "./container.js";

const env = loadEnv();
const app = createApp(createUseCases(), env.CORS_ORIGIN);

app.listen(env.PORT, () => {
  console.log(`Backend escuchando en http://localhost:${env.PORT}/api`);
});
