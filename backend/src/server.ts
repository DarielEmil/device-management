import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://127.0.0.1:3000";

createApp(corsOrigin).listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}/api`);
});
