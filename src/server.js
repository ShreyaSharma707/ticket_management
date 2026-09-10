const createApp = require('./app');
const { initDatabase, closeDatabase } = require('./db/database');
const config = require('./config');

let server;

async function start() {
  await initDatabase(config.databasePath);
  const app = createApp();

  if (require.main === module) {
    server = app.listen(config.port, () => {
      console.log(`Helpdesk API v1.0.0`);
      console.log(`  Environment : ${config.nodeEnv}`);
      console.log(`  Server      : http://localhost:${config.port}`);
      console.log(`  API docs    : http://localhost:${config.port}/api/docs`);
      console.log(`  Health      : http://localhost:${config.port}/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${config.port} is already in use`);
      } else {
        console.error('Server error:', err.message);
      }
      process.exit(1);
    });

    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        closeDatabase();
        console.log('Server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  return app;
}

const appPromise = start();

module.exports = appPromise;
