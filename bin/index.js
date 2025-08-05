import getApp from '../src/index.js';

const app = await getApp();
const port = process.env.PORT || 3000;
const host = process.env.FASTIFY_ADDRESS || '0.0.0.0';

// Запуск сервера
await app.listen({ port, host });
console.log(`Server running on http://${host}:${port}`);

// Graceful shutdown
process.on('SIGINT', () => {
  app.close().then(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});