import app from './src/app.js';
import connectDB from './src/config/db.js';
import env from './src/config/env.js';
import authService from './src/services/authService.js';
import testEnvironment from './testEnvironment.cjs';

const { getMongoDatabaseName, isDedicatedTestDatabaseName } = testEnvironment;
const configuredDatabaseName = getMongoDatabaseName(env.mongodbUri);

if (env.nodeEnv !== 'test' || !isDedicatedTestDatabaseName(configuredDatabaseName)) {
  console.error('Refusing to start the test server: NODE_ENV=test and a dedicated test database are required.');
  process.exit(1);
}

connectDB().then(async (connection) => {
  if (!connection) {
    throw new Error('Test database connection was not established.');
  }
  if (!isDedicatedTestDatabaseName(connection.connection.name)) {
    throw new Error('Refusing to provision test credentials: the connected MongoDB database is not a dedicated test database.');
  }

  // Test-only provisioning keeps fixture credentials aligned with the isolated test database.
  await authService.bootstrapAdmin({ forceRotate: true });

  app.listen(env.port, () => {
    console.log(`KONNEVIA_TEST_API_ACTIVE:${env.port}`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
