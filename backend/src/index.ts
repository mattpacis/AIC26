import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Campus360 backend listening on http://localhost:${env.PORT}`);
});
