import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["API_PORT"] ?? process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid API port value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port, url: `http://localhost:${port}` }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
