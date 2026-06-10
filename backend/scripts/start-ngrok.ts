import 'dotenv/config';
import ngrok from '@ngrok/ngrok';

const port = Number(process.env.PORT ?? 3001);

async function main() {
  const listener = await ngrok.forward({
    addr: port,
    authtoken_from_env: true,
  });

  const url = listener.url();
  if (!url) {
    throw new Error('ngrok did not return a public URL');
  }

  console.log(url);
  console.log(`Copilot base URL: ${url}/api`);
  console.log('Tunnel running — leave this terminal open.');

  const keepAlive = setInterval(() => {}, 60_000);

  process.on('SIGINT', async () => {
    clearInterval(keepAlive);
    await listener.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
