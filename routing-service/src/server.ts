import { createApp } from './app.js';
import { env } from './config/env.js';

async function main() {
  const app = await createApp(env);
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
