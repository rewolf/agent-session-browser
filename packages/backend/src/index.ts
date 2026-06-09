import { createServer } from "./server.js";
import { defaultProviderRegistry } from "@asb/core";

const registry = defaultProviderRegistry();
const app = createServer(registry);
const port = parseInt(process.env.PORT ?? "3847", 10);
app.listen(port, () => {
  console.log(`Session browser API http://localhost:${port}`);
});
